import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";
import type {
  LiveAcademicData,
  LiveBranch,
  LiveRoom,
  LiveTutor,
  LiveProgram,
  LiveClass,
  LiveSubject,
  LiveSchedule,
} from "@/lib/google-sheets/live-data";
import { getLiveAcademicData, invalidateLiveAcademicCache } from "@/lib/google-sheets/live-data";
import type { ScheduleManualStatus } from "@/domain/schedule-status";

/**
 * Sesudah update, ambil entitas versi gabungan (Sheet + mutasi lokal) supaya
 * pemanggil menerima record utuh. Tanpa ini, PATCH atas record asal Google
 * Sheet hanya mengembalikan field yang dikirim, sehingga UI menampilkan
 * misalnya "Ruangan undefined berhasil diperbarui".
 */
async function resolveMerged<K extends keyof LiveAcademicData>(
  collection: K,
  id: string,
  fallback: unknown,
): Promise<LiveAcademicData[K] extends Array<infer T> ? T | null : null> {
  try {
    const live = await getLiveAcademicData();
    const rows = live[collection] as unknown as Array<{ id: string }>;
    const found = Array.isArray(rows) ? rows.find((row) => row.id === id) : undefined;
    return (found ?? fallback) as never;
  } catch {
    return fallback as never;
  }
}

/** Dilempar saat entitas masih dipakai entitas lain, supaya route bisa balas 409. */
export class AcademicDependencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AcademicDependencyError";
  }
}

/**
 * Cegah penghapusan data master yang masih dirujuk. Tanpa ini, menghapus
 * cabang/ruangan/program meninggalkan jadwal & layar yang menunjuk id hilang,
 * sehingga nama cabang/ruangan kosong di layar TV dan halaman jadwal.
 */
async function assertNoDependents(
  checks: Array<{ count: number; label: string }>,
  entityLabel: string,
) {
  const blocking = checks.filter((check) => check.count > 0);
  if (blocking.length === 0) return;

  const detail = blocking.map((check) => `${check.count} ${check.label}`).join(", ");
  throw new AcademicDependencyError(
    `${entityLabel} masih dipakai oleh ${detail}. Hapus atau pindahkan data tersebut lebih dulu.`,
  );
}

const STORE_KEY = "academic_local_mutations_v1";

export interface AcademicStoreData {
  createdBranches: LiveBranch[];
  updatedBranches: Record<string, Partial<LiveBranch>>;
  deletedBranchIds: string[];

  createdRooms: Array<Omit<LiveRoom, "branch"> & { branchId: string }>;
  updatedRooms: Record<string, Partial<Omit<LiveRoom, "branch">>>;
  deletedRoomIds: string[];

  createdTutors: LiveTutor[];
  updatedTutors: Record<string, Partial<LiveTutor>>;
  deletedTutorIds: string[];

  createdPrograms: LiveProgram[];
  updatedPrograms: Record<string, Partial<LiveProgram>>;
  deletedProgramIds: string[];

  createdClasses: Array<Omit<LiveClass, "program"> & { programId: string }>;
  updatedClasses: Record<string, Partial<Omit<LiveClass, "program">>>;
  deletedClassIds: string[];

  createdSubjects: LiveSubject[];
  updatedSubjects: Record<string, Partial<LiveSubject>>;
  deletedSubjectIds: string[];

  createdSchedules: Array<{
    id: string;
    branchId: string;
    programId: string;
    classId: string;
    subjectId: string;
    tutorId: string;
    roomId: string;
    startAt: string;
    endAt: string;
    manualStatus: ScheduleManualStatus;
    notes: string | null;
  }>;
  updatedSchedules: Record<
    string,
    Partial<{
      branchId: string;
      programId: string;
      classId: string;
      subjectId: string;
      tutorId: string;
      roomId: string;
      startAt: string;
      endAt: string;
      manualStatus: ScheduleManualStatus;
      notes: string | null;
    }>
  >;
  deletedScheduleIds: string[];
}

/**
 * Nilai mentah baris SystemSetting saat store dibaca. Dipakai saveAcademicStore
 * sebagai syarat compare-and-swap; disimpan lewat Symbol agar tidak ikut
 * ter-serialisasi JSON.stringify.
 */
const BASELINE = Symbol("academicStoreBaseline");

type StoreWithBaseline = AcademicStoreData & { [BASELINE]?: string | null };

function attachBaseline(store: AcademicStoreData, raw: string | null): AcademicStoreData {
  Object.defineProperty(store, BASELINE, {
    value: raw,
    enumerable: false,
    writable: true,
    configurable: true,
  });
  return store;
}

function normalizeStore(parsed: Partial<AcademicStoreData>): AcademicStoreData {
  return {
    createdBranches: parsed.createdBranches ?? [],
    updatedBranches: parsed.updatedBranches ?? {},
    deletedBranchIds: parsed.deletedBranchIds ?? [],

    createdRooms: parsed.createdRooms ?? [],
    updatedRooms: parsed.updatedRooms ?? {},
    deletedRoomIds: parsed.deletedRoomIds ?? [],

    createdTutors: parsed.createdTutors ?? [],
    updatedTutors: parsed.updatedTutors ?? {},
    deletedTutorIds: parsed.deletedTutorIds ?? [],

    createdPrograms: parsed.createdPrograms ?? [],
    updatedPrograms: parsed.updatedPrograms ?? {},
    deletedProgramIds: parsed.deletedProgramIds ?? [],

    createdClasses: parsed.createdClasses ?? [],
    updatedClasses: parsed.updatedClasses ?? {},
    deletedClassIds: parsed.deletedClassIds ?? [],

    createdSubjects: parsed.createdSubjects ?? [],
    updatedSubjects: parsed.updatedSubjects ?? {},
    deletedSubjectIds: parsed.deletedSubjectIds ?? [],

    createdSchedules: parsed.createdSchedules ?? [],
    updatedSchedules: parsed.updatedSchedules ?? {},
    deletedScheduleIds: parsed.deletedScheduleIds ?? [],
  };
}

const CREATED_KEYS = [
  "createdBranches",
  "createdRooms",
  "createdTutors",
  "createdPrograms",
  "createdClasses",
  "createdSubjects",
  "createdSchedules",
] as const;

const UPDATED_KEYS = [
  "updatedBranches",
  "updatedRooms",
  "updatedTutors",
  "updatedPrograms",
  "updatedClasses",
  "updatedSubjects",
  "updatedSchedules",
] as const;

const DELETED_KEYS = [
  "deletedBranchIds",
  "deletedRoomIds",
  "deletedTutorIds",
  "deletedProgramIds",
  "deletedClassIds",
  "deletedSubjectIds",
  "deletedScheduleIds",
] as const;

/**
 * Gabungkan perubahan lokal ke store terbaru saat dua admin menyimpan
 * bersamaan. Tanpa ini, penyimpan kedua menimpa seluruh blob JSON milik yang
 * pertama. Aturan: record baru & penghapusan digabung (union), sedangkan pada
 * peta update hanya kunci yang benar-benar diubah penyimpan ini yang menang.
 */
export function mergeAcademicStores(
  baseline: AcademicStoreData,
  local: AcademicStoreData,
  fresh: AcademicStoreData,
): AcademicStoreData {
  const merged = normalizeStore(fresh);

  for (const key of CREATED_KEYS) {
    const freshRows = merged[key] as Array<{ id: string }>;
    const baselineIds = new Set((baseline[key] as Array<{ id: string }>).map((row) => row.id));
    const freshIds = new Set(freshRows.map((row) => row.id));
    const localAdditions = (local[key] as Array<{ id: string }>).filter(
      (row) => !baselineIds.has(row.id) && !freshIds.has(row.id),
    );
    (merged[key] as Array<{ id: string }>) = [...freshRows, ...localAdditions];
  }

  for (const key of UPDATED_KEYS) {
    const baselineMap = baseline[key] as Record<string, unknown>;
    const localMap = local[key] as Record<string, unknown>;
    const mergedMap = { ...(merged[key] as Record<string, unknown>) };

    for (const [id, value] of Object.entries(localMap)) {
      const before = baselineMap[id];
      if (JSON.stringify(before) !== JSON.stringify(value)) {
        mergedMap[id] = value;
      }
    }
    (merged[key] as Record<string, unknown>) = mergedMap;
  }

  for (const key of DELETED_KEYS) {
    (merged[key] as string[]) = Array.from(
      new Set([...(merged[key] as string[]), ...(local[key] as string[])]),
    );
  }

  return merged;
}

export async function getAcademicStore(): Promise<AcademicStoreData> {
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: STORE_KEY },
    });
    if (!setting?.value) return attachBaseline(normalizeStore({}), null);
    const parsed = JSON.parse(setting.value) as Partial<AcademicStoreData>;
    return attachBaseline(normalizeStore(parsed), setting.value);
  } catch (error) {
    console.error("Failed to read academic mutations store:", error);
    return attachBaseline(normalizeStore({}), null);
  }
}

async function readRawStore(): Promise<{ raw: string | null; parsed: AcademicStoreData }> {
  const setting = await db.systemSetting.findUnique({ where: { key: STORE_KEY } });
  if (!setting?.value) return { raw: null, parsed: normalizeStore({}) };
  try {
    return {
      raw: setting.value,
      parsed: normalizeStore(JSON.parse(setting.value) as Partial<AcademicStoreData>),
    };
  } catch {
    return { raw: setting.value, parsed: normalizeStore({}) };
  }
}

const SAVE_MAX_ATTEMPTS = 5;

/**
 * Simpan store dengan compare-and-swap: baris hanya ditulis bila nilainya masih
 * sama dengan saat dibaca. Bila admin lain menyimpan lebih dulu, perubahan
 * digabung (mergeAcademicStores) lalu dicoba lagi, sehingga tidak ada lagi
 * kasus "penyimpan terakhir menimpa seluruh perubahan admin sebelumnya".
 */
async function saveAcademicStore(store: AcademicStoreData, adminId?: string): Promise<void> {
  let baseline = (store as StoreWithBaseline)[BASELINE] ?? null;
  let baselineParsed = baseline
    ? normalizeStore(JSON.parse(baseline) as Partial<AcademicStoreData>)
    : normalizeStore({});
  let candidate = store;

  for (let attempt = 0; attempt < SAVE_MAX_ATTEMPTS; attempt += 1) {
    const value = JSON.stringify(candidate);

    if (baseline === null) {
      try {
        await db.systemSetting.create({
          data: { key: STORE_KEY, value, updatedById: adminId },
        });
        invalidateLiveAcademicCache();
        return;
      } catch {
        // Baris sudah dibuat proses lain: lanjut ke jalur merge di bawah.
      }
    } else {
      const result = await db.systemSetting.updateMany({
        where: { key: STORE_KEY, value: baseline },
        data: { value, updatedById: adminId },
      });
      if (result.count === 1) {
        invalidateLiveAcademicCache();
        return;
      }
    }

    const current = await readRawStore();
    candidate = mergeAcademicStores(baselineParsed, candidate, current.parsed);
    baselineParsed = current.parsed;
    baseline = current.raw;
  }

  throw new Error(
    "Gagal menyimpan perubahan data master karena ada penyimpanan lain yang bersamaan. Coba lagi.",
  );
}

/** Ringkasan berapa banyak perubahan lokal yang menimpa data Google Sheet. */
export async function countLocalOverrides() {
  const store = await getAcademicStore();
  const created =
    CREATED_KEYS.reduce((total, key) => total + (store[key] as unknown[]).length, 0);
  const updated =
    UPDATED_KEYS.reduce((total, key) => total + Object.keys(store[key] as object).length, 0);
  const deleted =
    DELETED_KEYS.reduce((total, key) => total + (store[key] as string[]).length, 0);

  return { created, updated, deleted, total: created + updated + deleted };
}

/**
 * Buang seluruh perubahan lokal sehingga Google Sheet kembali menjadi satu-
 * satunya sumber data akademik. Dipakai tombol "Sinkronisasi Ulang dari Sheet".
 */
export async function clearAcademicStore(adminId: string) {
  const before = await countLocalOverrides();

  await db.systemSetting.deleteMany({ where: { key: STORE_KEY } });
  invalidateLiveAcademicCache();

  await logActivity({
    actorId: adminId,
    action: "RESYNC_ACADEMIC_STORE",
    entityType: "SystemSetting",
    entityId: STORE_KEY,
    before,
  });

  return before;
}

function generateId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ==================== MERGE LOGIC ====================

export function applyAcademicStore(
  base: LiveAcademicData,
  store: AcademicStoreData,
): LiveAcademicData {
  // 1. Branches
  const deletedBranchSet = new Set(store.deletedBranchIds);
  const branchesMap = new Map<string, LiveBranch>();

  for (const b of base.branches) {
    if (deletedBranchSet.has(b.id)) continue;
    const update = store.updatedBranches[b.id];
    branchesMap.set(b.id, update ? { ...b, ...update } : b);
  }
  for (const b of store.createdBranches) {
    if (deletedBranchSet.has(b.id)) continue;
    const update = store.updatedBranches[b.id];
    branchesMap.set(b.id, update ? { ...b, ...update } : b);
  }
  const branches = Array.from(branchesMap.values());

  // 2. Programs
  const deletedProgramSet = new Set(store.deletedProgramIds);
  const programsMap = new Map<string, LiveProgram>();

  for (const p of base.programs) {
    if (deletedProgramSet.has(p.id)) continue;
    const update = store.updatedPrograms[p.id];
    programsMap.set(p.id, update ? { ...p, ...update } : p);
  }
  for (const p of store.createdPrograms) {
    if (deletedProgramSet.has(p.id)) continue;
    const update = store.updatedPrograms[p.id];
    programsMap.set(p.id, update ? { ...p, ...update } : p);
  }
  const programs = Array.from(programsMap.values());

  // 3. Classes
  const deletedClassSet = new Set(store.deletedClassIds);
  const classesMap = new Map<string, LiveClass>();

  for (const c of base.classes) {
    if (deletedClassSet.has(c.id)) continue;
    const update = store.updatedClasses[c.id];
    const merged = update ? { ...c, ...update } : c;
    const program = programsMap.get(merged.programId) ?? merged.program;
    classesMap.set(c.id, { ...merged, program });
  }
  for (const c of store.createdClasses) {
    if (deletedClassSet.has(c.id)) continue;
    const update = store.updatedClasses[c.id];
    const merged = update ? { ...c, ...update } : c;
    const program = programsMap.get(merged.programId) ?? {
      id: merged.programId,
      code: "UNKNOWN",
      name: "Program",
      level: null,
      color: "#3B82F6",
      isActive: true,
    };
    classesMap.set(c.id, { ...merged, program });
  }
  const classes = Array.from(classesMap.values());

  // 4. Rooms
  const deletedRoomSet = new Set(store.deletedRoomIds);
  const roomsMap = new Map<string, LiveRoom>();

  for (const r of base.rooms) {
    if (deletedRoomSet.has(r.id)) continue;
    const update = store.updatedRooms[r.id];
    const merged = update ? { ...r, ...update } : r;
    const branch = branchesMap.get(merged.branchId) ?? merged.branch;
    roomsMap.set(r.id, { ...merged, branch });
  }
  for (const r of store.createdRooms) {
    if (deletedRoomSet.has(r.id)) continue;
    const update = store.updatedRooms[r.id];
    const merged = update ? { ...r, ...update } : r;
    const branch = branchesMap.get(merged.branchId) ?? {
      id: merged.branchId,
      code: "UNKNOWN",
      name: "Cabang",
      address: null,
      timezone: "Asia/Jakarta",
      isActive: true,
    };
    roomsMap.set(r.id, { ...merged, branch });
  }
  const rooms = Array.from(roomsMap.values());

  // 5. Tutors
  const deletedTutorSet = new Set(store.deletedTutorIds);
  const tutorsMap = new Map<string, LiveTutor>();

  for (const t of base.tutors) {
    if (deletedTutorSet.has(t.id)) continue;
    const update = store.updatedTutors[t.id];
    tutorsMap.set(t.id, update ? { ...t, ...update } : t);
  }
  for (const t of store.createdTutors) {
    if (deletedTutorSet.has(t.id)) continue;
    const update = store.updatedTutors[t.id];
    tutorsMap.set(t.id, update ? { ...t, ...update } : t);
  }
  const tutors = Array.from(tutorsMap.values());

  // 6. Subjects
  const deletedSubjectSet = new Set(store.deletedSubjectIds);
  const subjectsMap = new Map<string, LiveSubject>();

  for (const s of base.subjects) {
    if (deletedSubjectSet.has(s.id)) continue;
    const update = store.updatedSubjects[s.id];
    subjectsMap.set(s.id, update ? { ...s, ...update } : s);
  }
  for (const s of store.createdSubjects) {
    if (deletedSubjectSet.has(s.id)) continue;
    const update = store.updatedSubjects[s.id];
    subjectsMap.set(s.id, update ? { ...s, ...update } : s);
  }
  const subjects = Array.from(subjectsMap.values());

  // 7. Schedules
  const deletedScheduleSet = new Set(store.deletedScheduleIds);
  const schedulesMap = new Map<string, LiveSchedule>();

  for (const sch of base.schedules) {
    if (deletedScheduleSet.has(sch.id)) continue;
    const update = store.updatedSchedules[sch.id];
    const merged = update
      ? {
          ...sch,
          ...update,
          startAt: update.startAt ? new Date(update.startAt) : sch.startAt,
          endAt: update.endAt ? new Date(update.endAt) : sch.endAt,
        }
      : sch;

    const branch = branchesMap.get(merged.branchId) ?? merged.branch;
    const room = roomsMap.get(merged.roomId) ?? merged.room;
    const tutor = tutorsMap.get(merged.tutorId) ?? merged.tutor;
    const program = programsMap.get(merged.programId) ?? merged.program;
    const klass = classesMap.get(merged.classId) ?? merged.class;
    const subject = subjectsMap.get(merged.subjectId) ?? merged.subject;

    schedulesMap.set(sch.id, {
      ...merged,
      branch,
      room,
      tutor,
      program,
      class: klass,
      subject,
    });
  }

  for (const sch of store.createdSchedules) {
    if (deletedScheduleSet.has(sch.id)) continue;
    const update = store.updatedSchedules[sch.id];
    const merged = update
      ? {
          ...sch,
          ...update,
          startAt: update.startAt ?? sch.startAt,
          endAt: update.endAt ?? sch.endAt,
        }
      : sch;

    const branch = branchesMap.get(merged.branchId) ?? {
      id: merged.branchId,
      code: "CABANG",
      name: "Cabang",
      address: null,
      timezone: "Asia/Jakarta",
      isActive: true,
    };
    const room = roomsMap.get(merged.roomId) ?? {
      id: merged.roomId,
      code: "ROOM",
      branchId: merged.branchId,
      branch,
      name: "Ruangan",
      floor: 1,
      capacity: null,
      status: "AVAILABLE",
      aliases: "[]",
    };
    const tutor = tutorsMap.get(merged.tutorId) ?? {
      id: merged.tutorId,
      code: "TUTOR",
      name: "Tutor",
      displayName: null,
      title: null,
      photoUrl: null,
      aliases: "[]",
      isActive: true,
    };
    const program = programsMap.get(merged.programId) ?? {
      id: merged.programId,
      code: "PROG",
      name: "Program",
      level: null,
      color: "#3B82F6",
      isActive: true,
    };
    const klass = classesMap.get(merged.classId) ?? {
      id: merged.classId,
      code: "KELAS",
      programId: merged.programId,
      program,
      name: "Kelas",
      academicYear: "2026/2027",
      isActive: true,
    };
    const subject = subjectsMap.get(merged.subjectId) ?? {
      id: merged.subjectId,
      code: "MAPEL",
      name: "Mata Pelajaran",
      shortName: "Mapel",
      icon: "book-open",
      aliases: "[]",
      isActive: true,
    };

    schedulesMap.set(sch.id, {
      id: sch.id,
      branchId: merged.branchId,
      programId: merged.programId,
      classId: merged.classId,
      subjectId: merged.subjectId,
      tutorId: merged.tutorId,
      roomId: merged.roomId,
      startAt: new Date(merged.startAt),
      endAt: new Date(merged.endAt),
      manualStatus: merged.manualStatus,
      notes: merged.notes,
      branch,
      room,
      tutor,
      program,
      class: klass,
      subject,
    });
  }

  const schedules = Array.from(schedulesMap.values());

  return {
    ...base,
    branches,
    programs,
    classes,
    rooms,
    tutors,
    subjects,
    schedules,
  };
}

// ==================== BRANCH CRUD ====================

export async function createBranch(
  data: { name: string; code: string; address?: string | null; timezone?: string; isActive?: boolean },
  adminId: string,
): Promise<LiveBranch> {
  const store = await getAcademicStore();
  const id = generateId("branch");
  const branch: LiveBranch = {
    id,
    code: data.code.toUpperCase(),
    name: data.name,
    address: data.address || null,
    timezone: data.timezone || "Asia/Jakarta",
    isActive: data.isActive ?? true,
  };

  store.createdBranches.push(branch);
  await saveAcademicStore(store, adminId);

  await logActivity({
    actorId: adminId,
    action: "BRANCH_CREATE",
    entityType: "Branch",
    entityId: id,
    after: branch,
  });

  return branch;
}

export async function updateBranch(
  id: string,
  data: Partial<LiveBranch>,
  adminId: string,
): Promise<LiveBranch | null> {
  const store = await getAcademicStore();
  const existingUpdate = store.updatedBranches[id] || {};
  store.updatedBranches[id] = { ...existingUpdate, ...data };

  // If in createdBranches, also update directly
  const createdIdx = store.createdBranches.findIndex((b) => b.id === id);
  if (createdIdx >= 0) {
    store.createdBranches[createdIdx] = {
      ...store.createdBranches[createdIdx],
      ...data,
    };
  }

  await saveAcademicStore(store, adminId);

  await logActivity({
    actorId: adminId,
    action: "BRANCH_UPDATE",
    entityType: "Branch",
    entityId: id,
    after: data,
  });

  return resolveMerged("branches", id, store.createdBranches[createdIdx] ?? { id, ...data });
}

export async function deleteBranch(id: string, adminId: string): Promise<boolean> {
  const live = await getLiveAcademicData();
  const screenCount = await db.screen.count({ where: { branchId: id, revokedAt: null } });
  await assertNoDependents(
    [
      { count: live.rooms.filter((row) => row.branchId === id).length, label: "ruangan" },
      { count: live.schedules.filter((row) => row.branchId === id).length, label: "jadwal" },
      { count: screenCount, label: "layar TV" },
    ],
    "Cabang",
  );

  const store = await getAcademicStore();
  if (!store.deletedBranchIds.includes(id)) {
    store.deletedBranchIds.push(id);
  }
  store.createdBranches = store.createdBranches.filter((b) => b.id !== id);
  delete store.updatedBranches[id];

  await saveAcademicStore(store, adminId);

  await logActivity({
    actorId: adminId,
    action: "BRANCH_DELETE",
    entityType: "Branch",
    entityId: id,
  });

  return true;
}

// ==================== ROOM CRUD ====================

export async function createRoom(
  data: {
    branchId: string;
    name: string;
    code?: string;
    floor?: number;
    capacity?: number | null;
    status?: string;
    aliases?: string | string[];
  },
  adminId: string,
): Promise<Omit<LiveRoom, "branch">> {
  const store = await getAcademicStore();
  const id = generateId("room");
  const aliasesStr = Array.isArray(data.aliases)
    ? JSON.stringify(data.aliases)
    : typeof data.aliases === "string" && data.aliases.startsWith("[")
      ? data.aliases
      : JSON.stringify(data.aliases ? [data.aliases] : []);

  const room = {
    id,
    code: data.code?.toUpperCase() || id.slice(-6).toUpperCase(),
    branchId: data.branchId,
    name: data.name,
    floor: data.floor ?? 1,
    capacity: data.capacity ?? null,
    status: data.status ?? "AVAILABLE",
    aliases: aliasesStr,
  };

  store.createdRooms.push(room);
  await saveAcademicStore(store, adminId);

  await logActivity({
    actorId: adminId,
    action: "ROOM_CREATE",
    entityType: "Room",
    entityId: id,
    after: room,
  });

  return room;
}

export async function updateRoom(
  id: string,
  data: Partial<Omit<LiveRoom, "branch" | "id" | "aliases">> & { aliases?: string | string[] },
  adminId: string,
) {
  const store = await getAcademicStore();
  const { aliases: rawAliases, ...restData } = data;
  const aliasesStr = rawAliases !== undefined
    ? (Array.isArray(rawAliases)
        ? JSON.stringify(rawAliases)
        : typeof rawAliases === "string" && rawAliases.startsWith("[")
          ? rawAliases
          : JSON.stringify(rawAliases ? [rawAliases] : []))
    : undefined;

  const updateData: Partial<Omit<LiveRoom, "branch">> = {
    ...restData,
    ...(aliasesStr !== undefined ? { aliases: aliasesStr } : {}),
  };

  const existing = store.updatedRooms[id] || {};
  store.updatedRooms[id] = { ...existing, ...updateData };

  const createdIdx = store.createdRooms.findIndex((r) => r.id === id);
  if (createdIdx >= 0) {
    store.createdRooms[createdIdx] = {
      ...store.createdRooms[createdIdx],
      ...updateData,
    };
  }

  await saveAcademicStore(store, adminId);

  await logActivity({
    actorId: adminId,
    action: "ROOM_UPDATE",
    entityType: "Room",
    entityId: id,
    after: updateData,
  });

  return resolveMerged("rooms", id, { id, ...updateData });
}

export async function deleteRoom(id: string, adminId: string): Promise<boolean> {
  const live = await getLiveAcademicData();
  const screenCount = await db.screen.count({ where: { roomId: id, revokedAt: null } });
  await assertNoDependents(
    [
      { count: live.schedules.filter((row) => row.roomId === id).length, label: "jadwal" },
      { count: screenCount, label: "layar TV" },
    ],
    "Ruangan",
  );

  const store = await getAcademicStore();
  if (!store.deletedRoomIds.includes(id)) {
    store.deletedRoomIds.push(id);
  }
  store.createdRooms = store.createdRooms.filter((r) => r.id !== id);
  delete store.updatedRooms[id];

  await saveAcademicStore(store, adminId);

  await logActivity({
    actorId: adminId,
    action: "ROOM_DELETE",
    entityType: "Room",
    entityId: id,
  });

  return true;
}

// ==================== TUTOR CRUD ====================

export async function createTutor(
  data: {
    name: string;
    code?: string;
    displayName?: string | null;
    title?: string | null;
    photoUrl?: string | null;
    aliases?: string | string[];
    isActive?: boolean;
  },
  adminId: string,
): Promise<LiveTutor> {
  const store = await getAcademicStore();
  const id = generateId("tutor");
  const aliasesStr = Array.isArray(data.aliases)
    ? JSON.stringify(data.aliases)
    : typeof data.aliases === "string" && data.aliases.startsWith("[")
      ? data.aliases
      : JSON.stringify(data.aliases ? [data.aliases] : []);

  const tutor: LiveTutor = {
    id,
    code: data.code?.toUpperCase() || id.slice(-6).toUpperCase(),
    name: data.name,
    displayName: data.displayName || null,
    title: data.title || null,
    photoUrl: data.photoUrl || null,
    aliases: aliasesStr,
    isActive: data.isActive ?? true,
  };

  store.createdTutors.push(tutor);
  await saveAcademicStore(store, adminId);

  await logActivity({
    actorId: adminId,
    action: "TUTOR_CREATE",
    entityType: "Tutor",
    entityId: id,
    after: tutor,
  });

  return tutor;
}

export async function updateTutor(
  id: string,
  data: Partial<Omit<LiveTutor, "id" | "aliases">> & { aliases?: string | string[] },
  adminId: string,
) {
  const store = await getAcademicStore();
  const { aliases: rawAliases, ...restData } = data;
  const aliasesStr = rawAliases !== undefined
    ? (Array.isArray(rawAliases)
        ? JSON.stringify(rawAliases)
        : typeof rawAliases === "string" && rawAliases.startsWith("[")
          ? rawAliases
          : JSON.stringify(rawAliases ? [rawAliases] : []))
    : undefined;

  const updateData: Partial<LiveTutor> = {
    ...restData,
    ...(aliasesStr !== undefined ? { aliases: aliasesStr } : {}),
  };

  const existing = store.updatedTutors[id] || {};
  store.updatedTutors[id] = { ...existing, ...updateData };

  const createdIdx = store.createdTutors.findIndex((t) => t.id === id);
  if (createdIdx >= 0) {
    store.createdTutors[createdIdx] = {
      ...store.createdTutors[createdIdx],
      ...updateData,
    };
  }

  await saveAcademicStore(store, adminId);

  await logActivity({
    actorId: adminId,
    action: "TUTOR_UPDATE",
    entityType: "Tutor",
    entityId: id,
    after: updateData,
  });

  return resolveMerged("tutors", id, { id, ...updateData });
}

export async function deleteTutor(id: string, adminId: string): Promise<boolean> {
  const live = await getLiveAcademicData();
  await assertNoDependents(
    [{ count: live.schedules.filter((row) => row.tutorId === id).length, label: "jadwal" }],
    "Tutor",
  );

  const store = await getAcademicStore();
  if (!store.deletedTutorIds.includes(id)) {
    store.deletedTutorIds.push(id);
  }
  store.createdTutors = store.createdTutors.filter((t) => t.id !== id);
  delete store.updatedTutors[id];

  await saveAcademicStore(store, adminId);

  await logActivity({
    actorId: adminId,
    action: "TUTOR_DELETE",
    entityType: "Tutor",
    entityId: id,
  });

  return true;
}

// ==================== SUBJECT CRUD ====================

export async function createSubject(
  data: {
    name: string;
    code?: string;
    shortName: string;
    icon?: string | null;
    aliases?: string | string[];
    isActive?: boolean;
  },
  adminId: string,
): Promise<LiveSubject> {
  const store = await getAcademicStore();
  const id = generateId("subject");
  const aliasesStr = Array.isArray(data.aliases)
    ? JSON.stringify(data.aliases)
    : typeof data.aliases === "string" && data.aliases.startsWith("[")
      ? data.aliases
      : JSON.stringify(data.aliases ? [data.aliases] : []);

  const subject: LiveSubject = {
    id,
    code: data.code?.toUpperCase() || id.slice(-6).toUpperCase(),
    name: data.name,
    shortName: data.shortName,
    icon: data.icon || "book-open",
    aliases: aliasesStr,
    isActive: data.isActive ?? true,
  };

  store.createdSubjects.push(subject);
  await saveAcademicStore(store, adminId);

  await logActivity({
    actorId: adminId,
    action: "SUBJECT_CREATE",
    entityType: "Subject",
    entityId: id,
    after: subject,
  });

  return subject;
}

export async function updateSubject(
  id: string,
  data: Partial<Omit<LiveSubject, "id" | "aliases">> & { aliases?: string | string[] },
  adminId: string,
) {
  const store = await getAcademicStore();
  const { aliases: rawAliases, ...restData } = data;
  const aliasesStr = rawAliases !== undefined
    ? (Array.isArray(rawAliases)
        ? JSON.stringify(rawAliases)
        : typeof rawAliases === "string" && rawAliases.startsWith("[")
          ? rawAliases
          : JSON.stringify(rawAliases ? [rawAliases] : []))
    : undefined;

  const updateData: Partial<LiveSubject> = {
    ...restData,
    ...(aliasesStr !== undefined ? { aliases: aliasesStr } : {}),
  };

  const existing = store.updatedSubjects[id] || {};
  store.updatedSubjects[id] = { ...existing, ...updateData };

  const createdIdx = store.createdSubjects.findIndex((s) => s.id === id);
  if (createdIdx >= 0) {
    store.createdSubjects[createdIdx] = {
      ...store.createdSubjects[createdIdx],
      ...updateData,
    };
  }

  await saveAcademicStore(store, adminId);

  await logActivity({
    actorId: adminId,
    action: "SUBJECT_UPDATE",
    entityType: "Subject",
    entityId: id,
    after: updateData,
  });

  return resolveMerged("subjects", id, { id, ...updateData });
}

export async function deleteSubject(id: string, adminId: string): Promise<boolean> {
  const live = await getLiveAcademicData();
  await assertNoDependents(
    [{ count: live.schedules.filter((row) => row.subjectId === id).length, label: "jadwal" }],
    "Mata pelajaran",
  );

  const store = await getAcademicStore();
  if (!store.deletedSubjectIds.includes(id)) {
    store.deletedSubjectIds.push(id);
  }
  store.createdSubjects = store.createdSubjects.filter((s) => s.id !== id);
  delete store.updatedSubjects[id];

  await saveAcademicStore(store, adminId);

  await logActivity({
    actorId: adminId,
    action: "SUBJECT_DELETE",
    entityType: "Subject",
    entityId: id,
  });

  return true;
}

// ==================== PROGRAM CRUD ====================

export async function createProgram(
  data: {
    name: string;
    code?: string;
    level?: string | null;
    color?: string;
    isActive?: boolean;
  },
  adminId: string,
): Promise<LiveProgram> {
  const store = await getAcademicStore();
  const id = generateId("program");
  const program: LiveProgram = {
    id,
    code: data.code?.toUpperCase() || id.slice(-6).toUpperCase(),
    name: data.name,
    level: data.level || null,
    color: data.color || "#3B82F6",
    isActive: data.isActive ?? true,
  };

  store.createdPrograms.push(program);
  await saveAcademicStore(store, adminId);

  await logActivity({
    actorId: adminId,
    action: "PROGRAM_CREATE",
    entityType: "Program",
    entityId: id,
    after: program,
  });

  return program;
}

export async function updateProgram(
  id: string,
  data: Partial<LiveProgram>,
  adminId: string,
) {
  const store = await getAcademicStore();
  const existing = store.updatedPrograms[id] || {};
  store.updatedPrograms[id] = { ...existing, ...data };

  const createdIdx = store.createdPrograms.findIndex((p) => p.id === id);
  if (createdIdx >= 0) {
    store.createdPrograms[createdIdx] = {
      ...store.createdPrograms[createdIdx],
      ...data,
    };
  }

  await saveAcademicStore(store, adminId);

  await logActivity({
    actorId: adminId,
    action: "PROGRAM_UPDATE",
    entityType: "Program",
    entityId: id,
    after: data,
  });

  return resolveMerged("programs", id, { id, ...data });
}

export async function deleteProgram(id: string, adminId: string): Promise<boolean> {
  const live = await getLiveAcademicData();
  await assertNoDependents(
    [
      { count: live.classes.filter((row) => row.programId === id).length, label: "kelas" },
      { count: live.schedules.filter((row) => row.programId === id).length, label: "jadwal" },
    ],
    "Program",
  );

  const store = await getAcademicStore();
  if (!store.deletedProgramIds.includes(id)) {
    store.deletedProgramIds.push(id);
  }
  store.createdPrograms = store.createdPrograms.filter((p) => p.id !== id);
  delete store.updatedPrograms[id];

  await saveAcademicStore(store, adminId);

  await logActivity({
    actorId: adminId,
    action: "PROGRAM_DELETE",
    entityType: "Program",
    entityId: id,
  });

  return true;
}

// ==================== CLASS CRUD ====================

export async function createClass(
  data: {
    programId: string;
    name: string;
    code?: string;
    academicYear?: string;
    isActive?: boolean;
  },
  adminId: string,
): Promise<Omit<LiveClass, "program">> {
  const store = await getAcademicStore();
  const id = generateId("class");
  const klass = {
    id,
    code: data.code?.toUpperCase() || id.slice(-6).toUpperCase(),
    programId: data.programId,
    name: data.name,
    academicYear: data.academicYear || "2026/2027",
    isActive: data.isActive ?? true,
  };

  store.createdClasses.push(klass);
  await saveAcademicStore(store, adminId);

  await logActivity({
    actorId: adminId,
    action: "CLASS_CREATE",
    entityType: "Class",
    entityId: id,
    after: klass,
  });

  return klass;
}

export async function updateClass(
  id: string,
  data: Partial<Omit<LiveClass, "program" | "id">>,
  adminId: string,
) {
  const store = await getAcademicStore();
  const existing = store.updatedClasses[id] || {};
  store.updatedClasses[id] = { ...existing, ...data };

  const createdIdx = store.createdClasses.findIndex((c) => c.id === id);
  if (createdIdx >= 0) {
    store.createdClasses[createdIdx] = {
      ...store.createdClasses[createdIdx],
      ...data,
    };
  }

  await saveAcademicStore(store, adminId);

  await logActivity({
    actorId: adminId,
    action: "CLASS_UPDATE",
    entityType: "Class",
    entityId: id,
    after: data,
  });

  return resolveMerged("classes", id, { id, ...data });
}

export async function deleteClass(id: string, adminId: string): Promise<boolean> {
  const live = await getLiveAcademicData();
  await assertNoDependents(
    [{ count: live.schedules.filter((row) => row.classId === id).length, label: "jadwal" }],
    "Kelas",
  );

  const store = await getAcademicStore();
  if (!store.deletedClassIds.includes(id)) {
    store.deletedClassIds.push(id);
  }
  store.createdClasses = store.createdClasses.filter((c) => c.id !== id);
  delete store.updatedClasses[id];

  await saveAcademicStore(store, adminId);

  await logActivity({
    actorId: adminId,
    action: "CLASS_DELETE",
    entityType: "Class",
    entityId: id,
  });

  return true;
}

// ==================== SCHEDULE CRUD ====================

export async function createSchedule(
  data: {
    branchId: string;
    programId: string;
    classId: string;
    subjectId: string;
    tutorId: string;
    roomId: string;
    startAt: string;
    endAt: string;
    manualStatus?: ScheduleManualStatus;
    notes?: string | null;
  },
  adminId: string,
) {
  const store = await getAcademicStore();
  const id = generateId("sch");
  const schedule = {
    id,
    branchId: data.branchId,
    programId: data.programId,
    classId: data.classId,
    subjectId: data.subjectId,
    tutorId: data.tutorId,
    roomId: data.roomId,
    startAt: data.startAt,
    endAt: data.endAt,
    manualStatus: data.manualStatus || "NONE",
    notes: data.notes || null,
  };

  store.createdSchedules.push(schedule);
  await saveAcademicStore(store, adminId);

  await logActivity({
    actorId: adminId,
    action: "SCHEDULE_CREATE",
    entityType: "Schedule",
    entityId: id,
    after: schedule,
  });

  return schedule;
}

export async function updateSchedule(
  id: string,
  data: Partial<{
    branchId: string;
    programId: string;
    classId: string;
    subjectId: string;
    tutorId: string;
    roomId: string;
    startAt: string;
    endAt: string;
    manualStatus: ScheduleManualStatus;
    notes: string | null;
  }>,
  adminId: string,
) {
  const store = await getAcademicStore();
  const existing = store.updatedSchedules[id] || {};
  store.updatedSchedules[id] = { ...existing, ...data };

  const createdIdx = store.createdSchedules.findIndex((s) => s.id === id);
  if (createdIdx >= 0) {
    store.createdSchedules[createdIdx] = {
      ...store.createdSchedules[createdIdx],
      ...data,
    };
  }

  await saveAcademicStore(store, adminId);

  await logActivity({
    actorId: adminId,
    action: "SCHEDULE_UPDATE",
    entityType: "Schedule",
    entityId: id,
    after: data,
  });

  return resolveMerged("schedules", id, { id, ...data });
}

export async function deleteSchedule(id: string, adminId: string): Promise<boolean> {
  const store = await getAcademicStore();
  if (!store.deletedScheduleIds.includes(id)) {
    store.deletedScheduleIds.push(id);
  }
  store.createdSchedules = store.createdSchedules.filter((s) => s.id !== id);
  delete store.updatedSchedules[id];

  await saveAcademicStore(store, adminId);

  await logActivity({
    actorId: adminId,
    action: "SCHEDULE_DELETE",
    entityType: "Schedule",
    entityId: id,
  });

  return true;
}
