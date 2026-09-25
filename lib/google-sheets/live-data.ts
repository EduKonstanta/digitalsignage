import { createHash } from "node:crypto";
import {
  createGoogleSheetsClient,
  getGoogleSheetsServiceAccountEmail,
  hasGoogleSheetsServiceAccount,
  isGoogleSheetsConfigured,
} from "@/lib/google-sheets/client";
import { GOOGLE_SHEETS_RANGES, GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SHEETS_URL } from "@/lib/google-sheets/config";
import {
  aliasesAsJson,
  asBoolean,
  asInteger,
  asOptionalText,
  asText,
  parseGoogleSheetsCsv,
  sheetDateTimeToUtc,
  sheetRows,
  type SheetRow,
} from "@/lib/google-sheets/parser";
import type { ScheduleManualStatus } from "@/domain/schedule-status";

export type SyncIssue = {
  sheet: string;
  row: number;
  key: string;
  reason: string;
};

export type LiveBranch = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  timezone: string;
  isActive: boolean;
};

export type LiveRoom = {
  id: string;
  code: string;
  branchId: string;
  branch: LiveBranch;
  name: string;
  floor: number;
  capacity: number | null;
  status: string;
  aliases: string;
};

export type LiveTutor = {
  id: string;
  code: string;
  name: string;
  displayName: string | null;
  title: string | null;
  photoUrl: string | null;
  aliases: string;
  isActive: boolean;
};

export type LiveProgram = {
  id: string;
  code: string;
  name: string;
  level: string | null;
  color: string;
  isActive: boolean;
};

export type LiveClass = {
  id: string;
  code: string;
  programId: string;
  program: LiveProgram;
  name: string;
  academicYear: string;
  isActive: boolean;
};

export type LiveSubject = {
  id: string;
  code: string;
  name: string;
  shortName: string;
  icon: string | null;
  aliases: string;
  isActive: boolean;
};

export type LiveSchedule = {
  id: string;
  branchId: string;
  programId: string;
  classId: string;
  subjectId: string;
  tutorId: string;
  roomId: string;
  branch: LiveBranch;
  program: LiveProgram;
  class: LiveClass;
  subject: LiveSubject;
  tutor: LiveTutor;
  room: LiveRoom;
  startAt: Date;
  endAt: Date;
  manualStatus: ScheduleManualStatus;
  notes: string | null;
};

export type LiveAcademicData = {
  fetchedAt: Date;
  branches: LiveBranch[];
  rooms: LiveRoom[];
  tutors: LiveTutor[];
  programs: LiveProgram[];
  classes: LiveClass[];
  subjects: LiveSubject[];
  schedules: LiveSchedule[];
  issues: SyncIssue[];
  /** true bila pembacaan Google Sheet gagal dan data di atas hanya fallback kosong. */
  fetchFailed?: boolean;
};

const CACHE_TTL_MS = 20_000;

let cache: { data: LiveAcademicData; expiresAt: number } | null = null;
let inFlight: Promise<LiveAcademicData> | null = null;
/**
 * Hasil baca Google Sheet terakhir yang berhasil. Bila Sheet gagal dibaca
 * sesaat (kuota, jaringan), data ini dipakai ulang supaya jadwal di TV tidak
 * mendadak kosong. Hanya bertahan selama instance server masih hidup.
 */
let lastGoodBase: LiveAcademicData | null = null;

function deterministicSourceId(sheet: string, key: string) {
  return `gs_${createHash("sha256")
    .update(`${GOOGLE_SHEETS_SPREADSHEET_ID}:${sheet}:${key}`)
    .digest("hex")
    .slice(0, 24)}`;
}

async function readGoogleSheetsRanges() {
  if (hasGoogleSheetsServiceAccount()) {
    const sheets = createGoogleSheetsClient();
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
      ranges: [...GOOGLE_SHEETS_RANGES],
      valueRenderOption: "UNFORMATTED_VALUE",
      dateTimeRenderOption: "SERIAL_NUMBER",
    });
    return (response.data.valueRanges ?? []).map((range) => (range.values ?? []) as unknown[][]);
  }

  return Promise.all(
    GOOGLE_SHEETS_RANGES.map(async (range) => {
      const separator = range.indexOf("!");
      const sheet = range.slice(0, separator);
      const cells = range.slice(separator + 1);
      const url =
        `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_SPREADSHEET_ID}` +
        `/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}&range=${encodeURIComponent(cells)}`;
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Google Sheet ${sheet} gagal dibaca (${response.status})`);
      }
      return parseGoogleSheetsCsv(await response.text());
    }),
  );
}

function readyRow(issues: SyncIssue[], sheet: string, row: SheetRow, keyIndex: number, statusIndex: number) {
  const key = asText(row.values[keyIndex]);
  if (!key) return null;

  const status = asText(row.values[statusIndex]);
  if (status !== "SIAP SYNC") {
    issues.push({ sheet, row: row.rowNumber, key, reason: status || "Status validasi kosong" });
    return null;
  }

  return key;
}

function pushIssue(issues: SyncIssue[], sheet: string, row: SheetRow, key: string, reason: string) {
  issues.push({ sheet, row: row.rowNumber, key, reason });
}

async function fetchAndParse(): Promise<LiveAcademicData> {
  const ranges = await readGoogleSheetsRanges();
  if (ranges.length !== GOOGLE_SHEETS_RANGES.length) {
    throw new Error("Struktur tab Google Sheet tidak lengkap atau tidak dapat dibaca");
  }

  const [branchRows, roomRows, tutorRows, programRows, classRows, subjectRows, scheduleRows] =
    ranges.map((values) => sheetRows(values));

  const issues: SyncIssue[] = [];

  const branches: LiveBranch[] = [];
  const branchesByCode = new Map<string, LiveBranch>();
  for (const row of branchRows) {
    const code = readyRow(issues, "CABANG", row, 0, 7);
    if (!code) continue;

    const branch: LiveBranch = {
      id: deterministicSourceId("CABANG", code),
      code,
      name: asText(row.values[1]),
      address: asOptionalText(row.values[2]),
      timezone: asText(row.values[3]) || "Asia/Jakarta",
      isActive: asBoolean(row.values[4]),
    };
    branches.push(branch);
    branchesByCode.set(code, branch);
  }

  const programs: LiveProgram[] = [];
  const programsByCode = new Map<string, LiveProgram>();
  for (const row of programRows) {
    const code = readyRow(issues, "PROGRAM", row, 0, 5);
    if (!code) continue;

    const program: LiveProgram = {
      id: deterministicSourceId("PROGRAM", code),
      code,
      name: asText(row.values[1]),
      level: asOptionalText(row.values[2]),
      color: asText(row.values[3]) || "#3B82F6",
      isActive: asBoolean(row.values[4]),
    };
    programs.push(program);
    programsByCode.set(code, program);
  }

  const classes: LiveClass[] = [];
  const classesByCode = new Map<string, LiveClass>();
  for (const row of classRows) {
    const code = readyRow(issues, "KELAS", row, 0, 5);
    if (!code) continue;

    const programCode = asText(row.values[1]);
    const program = programsByCode.get(programCode);
    if (!program) {
      pushIssue(issues, "KELAS", row, code, `Program ${programCode} tidak siap disinkronkan`);
      continue;
    }

    const klass: LiveClass = {
      id: deterministicSourceId("KELAS", code),
      code,
      programId: program.id,
      program,
      name: asText(row.values[2]),
      academicYear: asText(row.values[3]),
      isActive: asBoolean(row.values[4]),
    };
    classes.push(klass);
    classesByCode.set(code, klass);
  }

  const rooms: LiveRoom[] = [];
  const roomsByCode = new Map<string, LiveRoom>();
  for (const row of roomRows) {
    const code = readyRow(issues, "RUANGAN", row, 0, 7);
    if (!code) continue;

    const branchCode = asText(row.values[1]);
    const branch = branchesByCode.get(branchCode);
    if (!branch) {
      pushIssue(issues, "RUANGAN", row, code, `Cabang ${branchCode} tidak siap disinkronkan`);
      continue;
    }

    const room: LiveRoom = {
      id: deterministicSourceId("RUANGAN", code),
      code,
      branchId: branch.id,
      branch,
      name: asText(row.values[2]),
      floor: asInteger(row.values[3], 1) ?? 1,
      capacity: asInteger(row.values[4]),
      status: asText(row.values[5]) || "AVAILABLE",
      aliases: aliasesAsJson(row.values[6]),
    };
    rooms.push(room);
    roomsByCode.set(code, room);
  }

  const tutors: LiveTutor[] = [];
  const tutorsByCode = new Map<string, LiveTutor>();
  for (const row of tutorRows) {
    const code = readyRow(issues, "TUTOR", row, 0, 7);
    if (!code) continue;

    const tutor: LiveTutor = {
      id: deterministicSourceId("TUTOR", code),
      code,
      name: asText(row.values[1]),
      displayName: asOptionalText(row.values[2]),
      title: asOptionalText(row.values[3]),
      photoUrl: asOptionalText(row.values[4]),
      aliases: aliasesAsJson(row.values[5]),
      isActive: asBoolean(row.values[6]),
    };
    tutors.push(tutor);
    tutorsByCode.set(code, tutor);
  }

  const subjects: LiveSubject[] = [];
  const subjectsByCode = new Map<string, LiveSubject>();
  for (const row of subjectRows) {
    const code = readyRow(issues, "MATA_PELAJARAN", row, 0, 6);
    if (!code) continue;

    const subject: LiveSubject = {
      id: deterministicSourceId("MATA_PELAJARAN", code),
      code,
      name: asText(row.values[1]),
      shortName: asText(row.values[2]),
      icon: asOptionalText(row.values[3]),
      aliases: aliasesAsJson(row.values[4]),
      isActive: asBoolean(row.values[5]),
    };
    subjects.push(subject);
    subjectsByCode.set(code, subject);
  }

  const schedules: LiveSchedule[] = [];
  for (const row of scheduleRows) {
    const sheetId = asText(row.values[0]);
    const rowKey = sheetId || `baris-${row.rowNumber}`;
    if (!asText(row.values[1])) continue;

    const validationStatus = asText(row.values[13]);
    const conflictStatus = asText(row.values[14]);
    if (validationStatus !== "SIAP SYNC" || conflictStatus !== "AMAN") {
      pushIssue(
        issues,
        "JADWAL",
        row,
        rowKey,
        [validationStatus || "Validasi kosong", conflictStatus || "Cek bentrok kosong"].join(" / "),
      );
      continue;
    }

    if (!asBoolean(row.values[12])) {
      pushIssue(issues, "JADWAL", row, rowKey, "Kolom siap tayang belum dicentang");
      continue;
    }

    const branch = branchesByCode.get(asText(row.values[4]));
    const program = programsByCode.get(asText(row.values[5]));
    const klass = classesByCode.get(asText(row.values[6]));
    const subject = subjectsByCode.get(asText(row.values[7]));
    const tutor = tutorsByCode.get(asText(row.values[8]));
    const room = roomsByCode.get(asText(row.values[9]));
    if (!branch || !program || !klass || !subject || !tutor || !room) {
      pushIssue(issues, "JADWAL", row, rowKey, "Referensi master belum lengkap");
      continue;
    }

    let startAt: Date;
    let endAt: Date;
    try {
      startAt = sheetDateTimeToUtc(row.values[1], row.values[2], branch.timezone);
      endAt = sheetDateTimeToUtc(row.values[1], row.values[3], branch.timezone);
    } catch (error) {
      pushIssue(issues, "JADWAL", row, rowKey, error instanceof Error ? error.message : "Tanggal tidak valid");
      continue;
    }

    if (endAt <= startAt) {
      pushIssue(issues, "JADWAL", row, rowKey, "Jam selesai harus setelah jam mulai");
      continue;
    }

    const manualStatus = asText(row.values[10]) || "NONE";
    if (!["NONE", "DELAYED", "CANCELLED", "MOVED_ROOM", "ONLINE"].includes(manualStatus)) {
      pushIssue(issues, "JADWAL", row, rowKey, `Status manual tidak valid: ${manualStatus}`);
      continue;
    }

    // Same-run overlap check: mirrors the old DB conflict query (room OR
    // tutor overlap, ignoring already-accepted rows that are CANCELLED),
    // just evaluated against the rows already accepted in this pass instead
    // of a persisted table.
    const conflict = schedules.find(
      (existing) =>
        existing.manualStatus !== "CANCELLED" &&
        (existing.roomId === room.id || existing.tutorId === tutor.id) &&
        startAt < existing.endAt &&
        endAt > existing.startAt,
    );
    if (conflict) {
      pushIssue(issues, "JADWAL", row, rowKey, "Bentrok tutor atau ruangan");
      continue;
    }

    schedules.push({
      id: deterministicSourceId("JADWAL", sheetId || String(row.rowNumber)),
      branchId: branch.id,
      programId: program.id,
      classId: klass.id,
      subjectId: subject.id,
      tutorId: tutor.id,
      roomId: room.id,
      branch,
      program,
      class: klass,
      subject,
      tutor,
      room,
      startAt,
      endAt,
      manualStatus: manualStatus as ScheduleManualStatus,
      notes: asOptionalText(row.values[11]),
    });
  }

  return {
    fetchedAt: new Date(),
    branches,
    rooms,
    tutors,
    programs,
    classes,
    subjects,
    schedules,
    issues,
    fetchFailed: false,
  };
}

export function invalidateLiveAcademicCache() {
  cache = null;
  inFlight = null;
}

export async function getLiveAcademicData(options?: { force?: boolean }): Promise<LiveAcademicData> {
  const force = options?.force ?? false;
  const now = Date.now();

  if (!force && cache && cache.expiresAt > now) {
    return cache.data;
  }
  if (!force && inFlight) {
    return inFlight;
  }

  const request = (async () => {
    try {
      const { getAcademicStore, applyAcademicStore } = await import("@/lib/academic-store");
      const [baseData, store] = await Promise.all([
        fetchAndParse().then((data) => {
          lastGoodBase = data;
          return data;
        }).catch((err): LiveAcademicData => {
          console.warn("Failed to fetch Google Sheets data:", err);
          // Kegagalan dicatat sebagai issue supaya halaman Integrasi bisa
          // menampilkannya; tanpa ini Sheet mati terlihat seperti "0 data".
          const connectionIssue: SyncIssue = {
            sheet: "KONEKSI",
            row: 0,
            key: "-",
            reason: `Gagal membaca Google Sheet: ${
              err instanceof Error ? err.message : "penyebab tidak diketahui"
            }`,
          };
          if (lastGoodBase) {
            return {
              ...lastGoodBase,
              issues: [connectionIssue, ...lastGoodBase.issues],
              fetchFailed: true,
            };
          }
          return {
            fetchedAt: new Date(),
            branches: [],
            rooms: [],
            tutors: [],
            programs: [],
            classes: [],
            subjects: [],
            schedules: [],
            issues: [connectionIssue],
            fetchFailed: true,
          };
        }),
        getAcademicStore(),
      ]);
      const merged = applyAcademicStore(baseData, store);
      merged.fetchFailed = baseData.fetchFailed ?? false;
      cache = { data: merged, expiresAt: Date.now() + CACHE_TTL_MS };
      inFlight = null;
      return merged;
    } catch (error) {
      inFlight = null;
      throw error;
    }
  })();

  inFlight = request;
  return request;
}

export async function getLiveDataStatus(options?: { force?: boolean }) {
  const data = await getLiveAcademicData(options);
  return {
    spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
    spreadsheetUrl: GOOGLE_SHEETS_URL,
    configured: isGoogleSheetsConfigured() && !data.fetchFailed,
    fetchFailed: data.fetchFailed ?? false,
    serviceAccountEmail: getGoogleSheetsServiceAccountEmail(),
    fetchedAt: data.fetchedAt.toISOString(),
    counts: {
      branches: data.branches.length,
      rooms: data.rooms.length,
      tutors: data.tutors.length,
      programs: data.programs.length,
      classes: data.classes.length,
      subjects: data.subjects.length,
      schedules: data.schedules.length,
    },
    issues: data.issues,
  };
}
