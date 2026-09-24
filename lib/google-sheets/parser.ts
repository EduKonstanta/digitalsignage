import { fromZonedTime } from "date-fns-tz";

export type SheetRow = {
  rowNumber: number;
  values: unknown[];
};

export function sheetRows(values: unknown[][] | null | undefined, firstRow = 5): SheetRow[] {
  return (values ?? []).map((row, index) => ({
    rowNumber: firstRow + index,
    values: row,
  }));
}

export function asText(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

export function asOptionalText(value: unknown) {
  const text = asText(value);
  return text || null;
}

export function asBoolean(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  const normalized = asText(value).toLowerCase();
  if (["true", "ya", "yes", "1", "aktif"].includes(normalized)) return true;
  if (["false", "tidak", "no", "0", "nonaktif"].includes(normalized)) return false;
  return fallback;
}

export function asInteger(value: unknown, fallback: number | null = null) {
  if (value === "" || value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

export function aliasesAsJson(value: unknown) {
  const aliases = asText(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return JSON.stringify([...new Set(aliases)]);
}

export function parseGoogleSheetsCsv(csv: string): unknown[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (quoted) {
      if (character === '"' && csv[index + 1] === '"') {
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
    } else if (character === ",") {
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

  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }

  // Baris kosong sengaja dipertahankan: sheetRows() menomori baris berdasarkan
  // indeks array, jadi membuang baris kosong di sini menggeser nomor baris yang
  // dilaporkan ke admin (baris 7 dilaporkan sebagai baris 6). Baris kosong
  // nanti diabaikan readyRow() karena kolom kuncinya kosong.
  return rows;
}

function serialDateToIsoDate(value: number) {
  const milliseconds = Math.round((Math.trunc(value) - 25569) * 86_400_000);
  return new Date(milliseconds).toISOString().slice(0, 10);
}

function serialTimeToClock(value: number) {
  const totalSeconds = Math.round((((value % 1) + 1) % 1) * 86_400) % 86_400;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function textDateToIsoDate(value: string) {
  const normalized = value.trim();
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return normalized;

  const localMatch = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!localMatch) throw new Error(`Tanggal tidak valid: ${value}`);

  return `${localMatch[3]}-${localMatch[2].padStart(2, "0")}-${localMatch[1].padStart(2, "0")}`;
}

function textTimeToClock(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) throw new Error(`Jam tidak valid: ${value}`);
  return `${match[1].padStart(2, "0")}:${match[2]}:${match[3] ?? "00"}`;
}

export function sheetDateTimeToUtc(
  dateValue: unknown,
  timeValue: unknown,
  timezone = "Asia/Jakarta",
) {
  const date =
    typeof dateValue === "number"
      ? serialDateToIsoDate(dateValue)
      : textDateToIsoDate(asText(dateValue));
  const time =
    typeof timeValue === "number"
      ? serialTimeToClock(timeValue)
      : textTimeToClock(asText(timeValue));

  return fromZonedTime(`${date}T${time}`, timezone);
}
