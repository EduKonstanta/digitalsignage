import { describe, expect, it } from "vitest";
import {
  aliasesAsJson,
  asBoolean,
  asInteger,
  parseGoogleSheetsCsv,
  sheetDateTimeToUtc,
  sheetRows,
} from "@/lib/google-sheets/parser";

describe("Google Sheets academic parser", () => {
  it("normalizes boolean and integer input", () => {
    expect(asBoolean("YA")).toBe(true);
    expect(asBoolean("false")).toBe(false);
    expect(asInteger("12")).toBe(12);
    expect(asInteger("12.5")).toBeNull();
  });

  it("normalizes comma-separated aliases without duplicates", () => {
    expect(aliasesAsJson("R101, Lab 101, R101")).toBe('["R101","Lab 101"]');
  });

  it("keeps the physical Google Sheet row number", () => {
    expect(sheetRows([["A"], ["B"]])).toEqual([
      { rowNumber: 5, values: ["A"] },
      { rowNumber: 6, values: ["B"] },
    ]);
  });

  it("parses the public Google Sheets CSV format", () => {
    expect(parseGoogleSheetsCsv('"R101","Growie, Utama","He said ""ready"""\r\n')).toEqual([
      ["R101", "Growie, Utama", 'He said "ready"'],
    ]);
  });

  it("keeps blank CSV rows so reported row numbers stay aligned", () => {
    const csv = '"R101","Growie"\r\n"",""\r\n"R103","Inno"\r\n';
    const rows = sheetRows(parseGoogleSheetsCsv(csv));

    expect(rows).toHaveLength(3);
    // Baris ketiga CSV harus tetap dilaporkan sebagai baris 7, bukan 6.
    expect(rows[2]).toEqual({ rowNumber: 7, values: ["R103", "Inno"] });
  });

  it("converts a Jakarta sheet serial date/time to UTC", () => {
    expect(sheetDateTimeToUtc(46231, 0.7535648148148149).toISOString()).toBe(
      "2026-07-28T11:05:08.000Z",
    );
  });

  it("accepts Indonesian display date and clock text", () => {
    expect(sheetDateTimeToUtc("28/07/2026", "18:05").toISOString()).toBe(
      "2026-07-28T11:05:00.000Z",
    );
  });
});
