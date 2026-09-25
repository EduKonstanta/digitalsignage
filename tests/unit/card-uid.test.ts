import { describe, expect, it } from "vitest";
import {
  canonicalCardUid,
  displayCardUid,
  findByCardUid,
  findCardConflict,
} from "@/lib/card-uid";
import { parseStudentCsv } from "@/lib/student-import";

describe("canonicalCardUid", () => {
  it.each(["978C9877", "978c9877", "97:8C:98:77", "97-8c-98-77", " 97 8C 98 77 "])(
    "menyeragamkan %j",
    (input) => {
      expect(canonicalCardUid(input)).toBe("978C9877");
    },
  );

  it("mengembalikan string kosong bila tidak ada karakter UID", () => {
    expect(canonicalCardUid(" :- ")).toBe("");
  });
});

describe("findByCardUid", () => {
  const students = [
    { id: "a", cardUid: "978C9877" },
    { id: "b", cardUid: "37:A7:12:01" },
    { id: "c", cardUid: null },
  ];

  it("mencocokkan walau format tulisan UID berbeda", () => {
    expect(findByCardUid(students, "97:8c:98:77")?.id).toBe("a");
    expect(findByCardUid(students, "37a71201")?.id).toBe("b");
  });

  it("mengembalikan null untuk kartu yang tidak terdaftar atau UID kosong", () => {
    expect(findByCardUid(students, "DEADBEEF")).toBeNull();
    expect(findByCardUid(students, " : ")).toBeNull();
  });

  it("menolak UID yang cocok dengan lebih dari satu siswa", () => {
    const ambiguous = [
      { id: "x", cardUid: "AA:BB" },
      { id: "y", cardUid: "aabb" },
    ];
    expect(findByCardUid(ambiguous, "AABB")).toBeNull();
  });
});

describe("displayCardUid", () => {
  it("menampilkan UID pendek dalam bentuk kanonik", () => {
    expect(displayCardUid("97:8c:98:77")).toBe("978C9877");
  });

  it("menyingkat UID panjang untuk display publik", () => {
    expect(displayCardUid("04:a1:b2:c3:d4:e5")).toBe("04A1...D4E5");
  });
});

describe("findCardConflict", () => {
  const students = [
    { id: "a", cardUid: "978C9877" },
    { id: "b", cardUid: "37:a7:12:01" },
    { id: "c", cardUid: null },
  ];

  it("mendeteksi UID yang sama walau ditulis dengan format berbeda", () => {
    expect(findCardConflict(students, "97:8c:98:77")?.id).toBe("a");
    expect(findCardConflict(students, "37A71201")?.id).toBe("b");
  });

  it("mengabaikan siswa yang sedang diedit", () => {
    expect(findCardConflict(students, "978C9877", "a")).toBeNull();
  });

  it("mengembalikan null untuk UID baru atau kosong", () => {
    expect(findCardConflict(students, "DEADBEEF")).toBeNull();
    expect(findCardConflict(students, " - ")).toBeNull();
  });
});

describe("parseStudentCsv dengan UID berformat campuran", () => {
  it("menyimpan UID dalam bentuk kanonik", () => {
    const result = parseStudentCsv("Nama,UID Kartu\nRaka,04:aa:bb:cc");
    expect(result.rows[0].cardUid).toBe("04AABBCC");
  });

  it("menandai UID ganda walau formatnya berbeda", () => {
    const result = parseStudentCsv("Nama,UID Kartu\nRaka,04:aa:bb:cc\nBudi,04AABBCC");
    expect(result.rows[1].errors[0]).toMatch(/UID kartu .* dua kali/);
  });
});
