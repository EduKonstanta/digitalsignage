import { describe, expect, it } from "vitest";
import { canonicalCardUid, findByCardUid } from "@/lib/card-uid";

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
