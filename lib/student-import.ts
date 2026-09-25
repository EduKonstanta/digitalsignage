/**
 * Pembacaan daftar siswa dari CSV yang disalin dari sistem lain.
 *
 * Sumbernya bisa apa saja — ekspor aplikasi presensi, Excel, Google Sheet —
 * sehingga nama kolom tidak bisa diasumsikan. Modul ini mencocokkan header
 * dengan daftar sebutan yang lazim dipakai di sekolah Indonesia, lalu
 * melaporkan kolom mana yang dikenali supaya operator bisa memeriksanya
 * sebelum data benar-benar disimpan.
 */

import { canonicalCardUid } from "@/lib/card-uid";

export type StudentFieldKey =
  | "nis"
  | "name"
  | "className"
  | "cardUid"
  | "parentName"
  | "parentPhone"
  | "studentPhone"
  | "voiceGender";

/**
 * Hanya nama yang benar-benar wajib, mengikuti endpoint pembuatan siswa yang
 * membuat NIS dan kelas sendiri bila tidak diisi. UID kartu tidak diwajibkan
 * karena banyak sumber data tidak menyimpannya — tetapi barisnya ditandai,
 * sebab tanpa UID kartu siswa itu tidak akan dikenali saat menempel kartu.
 */
export const REQUIRED_FIELDS: StudentFieldKey[] = ["name"];

export const FIELD_LABELS: Record<StudentFieldKey, string> = {
  nis: "NIS",
  name: "Nama",
  className: "Kelas",
  cardUid: "UID Kartu",
  parentName: "Nama Ortu/Wali",
  parentPhone: "WhatsApp Ortu",
  studentPhone: "HP Siswa",
  voiceGender: "Gender Suara",
};

/**
 * Sebutan kolom yang dianggap sama. Dicocokkan setelah header dikecilkan dan
 * dibuang tanda bacanya, sehingga "No. Induk" dan "no_induk" sama-sama kena.
 */
const FIELD_ALIASES: Record<StudentFieldKey, string[]> = {
  nis: ["nis", "nisn", "nomor induk", "no induk", "induk", "id siswa", "student id", "nomor siswa"],
  name: ["nama", "nama lengkap", "nama siswa", "siswa", "name", "student name", "full name"],
  className: ["kelas", "rombel", "rombongan belajar", "class", "kelompok", "grade", "tingkat"],
  cardUid: ["uid", "rfid", "uid kartu", "kartu", "no kartu", "nomor kartu", "card", "card uid", "tag", "tag id"],
  parentName: [
    "nama ortu", "orang tua", "ortu", "wali", "nama wali", "parent", "parent name", "nama orang tua",
    // Label kolom yang ditampilkan modal impor sendiri ("Nama Ortu/Wali").
    "nama ortu wali", "ortu wali", "orang tua wali",
  ],
  parentPhone: [
    "wa ortu", "whatsapp ortu", "no wa ortu", "hp ortu", "no hp ortu", "telepon ortu",
    "nomor ortu", "wa wali", "hp wali", "no wa", "whatsapp", "wa", "parent phone", "no telepon ortu",
  ],
  studentPhone: ["hp siswa", "no hp siswa", "telepon siswa", "wa siswa", "student phone", "no hp"],
  // "gender suara" adalah label kolom di modal impor; "l p" adalah "L/P" setelah dinormalkan.
  voiceGender: ["gender", "gender suara", "suara", "jenis kelamin", "jk", "l p", "kelamin", "sex"],
};

export interface ParsedStudentRow {
  rowNumber: number;
  nis: string;
  name: string;
  className: string;
  cardUid: string | null;
  parentName: string | null;
  parentPhone: string | null;
  studentPhone: string | null;
  voiceGender: "AUTO" | "MALE" | "FEMALE";
  /** Baris tidak akan diimpor. */
  errors: string[];
  /** Baris tetap diimpor, tetapi ada yang perlu dilengkapi kemudian. */
  warnings: string[];
}

export interface StudentCsvParseResult {
  headers: string[];
  mapping: Partial<Record<StudentFieldKey, number>>;
  missingRequired: StudentFieldKey[];
  rows: ParsedStudentRow[];
  delimiter: string;
}

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .replace(/[._/\\-]+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Excel berbahasa Indonesia sering menyimpan CSV dengan titik koma, sementara
 * ekspor aplikasi web biasanya memakai koma. Pemisah ditebak dari baris header
 * karena di situlah jumlah kolom paling dapat diandalkan.
 */
function detectDelimiter(firstLine: string) {
  const candidates = [",", ";", "\t", "|"];
  let best = ",";
  let bestCount = 0;
  for (const candidate of candidates) {
    const count = firstLine.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

/** Pembacaan CSV yang menghormati tanda kutip, termasuk kutip ganda di dalam sel. */
function parseRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === delimiter) {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (cell !== "" || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows;
}

/**
 * Menyeragamkan nomor menjadi format 62xxxx yang diminta Fonnte. Nomor yang
 * jelas bukan nomor Indonesia dibiarkan apa adanya agar tidak dirusak diam-diam.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

export function normalizeGender(raw: string): "AUTO" | "MALE" | "FEMALE" {
  const value = raw.trim().toLowerCase();
  if (["l", "laki", "laki-laki", "laki laki", "m", "male", "pria", "putra"].includes(value)) {
    return "MALE";
  }
  if (["p", "perempuan", "f", "female", "wanita", "putri"].includes(value)) {
    return "FEMALE";
  }
  return "AUTO";
}

export function parseStudentCsv(text: string): StudentCsvParseResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { headers: [], mapping: {}, missingRequired: [...REQUIRED_FIELDS], rows: [], delimiter: "," };
  }

  const delimiter = detectDelimiter(trimmed.split("\n")[0] ?? "");
  const grid = parseRows(trimmed, delimiter);
  const headerRow = grid.shift() ?? [];
  const headers = headerRow.map((header) => header.trim());

  const mapping: Partial<Record<StudentFieldKey, number>> = {};
  const taken = new Set<number>();

  // Sebutan yang lebih panjang diuji lebih dulu supaya "no hp ortu" tidak
  // keburu direbut oleh "no hp".
  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [StudentFieldKey, string[]][]) {
    const sorted = [...aliases].sort((a, b) => b.length - a.length);
    for (const alias of sorted) {
      const index = headers.findIndex(
        (header, position) => !taken.has(position) && normalizeHeader(header) === alias,
      );
      if (index !== -1) {
        mapping[field] = index;
        taken.add(index);
        break;
      }
    }
  }

  const cell = (row: string[], field: StudentFieldKey) => {
    const index = mapping[field];
    if (index === undefined) return "";
    return (row[index] ?? "").trim();
  };

  const rows: ParsedStudentRow[] = [];
  const seenNis = new Set<string>();
  const seenCards = new Set<string>();

  grid.forEach((row, index) => {
    // Baris kosong di ujung berkas lazim dan bukan kesalahan operator.
    if (row.every((value) => value.trim() === "")) return;

    const nis = cell(row, "nis");
    const name = cell(row, "name");
    const className = cell(row, "className");
    // Bentuk kanonik supaya "04:aa:bb:cc" dan "04AABBCC" dikenali sebagai kartu yang sama.
    const cardUid = canonicalCardUid(cell(row, "cardUid"));
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!name) errors.push("Nama kosong");
    if (nis && seenNis.has(nis)) errors.push(`NIS ${nis} muncul dua kali di berkas ini`);
    if (cardUid && seenCards.has(cardUid)) {
      errors.push(`UID kartu ${cardUid} muncul dua kali di berkas ini`);
    }

    if (!cardUid) warnings.push("UID kartu kosong — kartu harus didaftarkan manual nanti");
    if (!nis) warnings.push("NIS kosong — dibuatkan otomatis");
    if (!className) warnings.push("Kelas kosong — diisi nama lembaga");

    if (nis) seenNis.add(nis);
    if (cardUid) seenCards.add(cardUid);

    rows.push({
      // +2: satu untuk baris header, satu karena manusia menghitung dari 1.
      rowNumber: index + 2,
      nis,
      name,
      className,
      cardUid: cardUid || null,
      parentName: cell(row, "parentName") || null,
      parentPhone: normalizePhone(cell(row, "parentPhone")),
      studentPhone: normalizePhone(cell(row, "studentPhone")),
      voiceGender: normalizeGender(cell(row, "voiceGender")),
      errors,
      warnings,
    });
  });

  return {
    headers,
    mapping,
    missingRequired: REQUIRED_FIELDS.filter((field) => mapping[field] === undefined),
    rows,
    delimiter,
  };
}
