import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, validatePassword } from "@/lib/password-policy";

describe("validatePassword", () => {
  it("menerima password yang cukup panjang dan tidak umum", () => {
    expect(validatePassword("kata-sandi-yang-kuat-2026")).toBeNull();
  });

  it("menolak password kosong", () => {
    expect(validatePassword("")).toMatch(/wajib diisi/i);
    expect(validatePassword("   ")).toMatch(/wajib diisi/i);
  });

  it("menolak password yang lebih pendek dari batas minimum", () => {
    const tooShort = "a".repeat(MIN_PASSWORD_LENGTH - 1);
    expect(validatePassword(tooShort)).toMatch(/minimal/i);
  });

  it("menerima password tepat sepanjang batas minimum", () => {
    expect(validatePassword("a".repeat(MIN_PASSWORD_LENGTH))).toBeNull();
  });

  /**
   * Nilai bawaan seed dan placeholder .env.example harus tetap ditolak walaupun
   * panjangnya melebihi batas minimum — panjang saja tidak membuatnya rahasia.
   */
  it("menolak nilai bawaan dan placeholder meski panjang", () => {
    expect(validatePassword("admin123")).toMatch(/daftar tolak/i);
    expect(validatePassword("replace-with-a-strong-password")).toMatch(/daftar tolak/i);
  });

  it("mengabaikan beda huruf besar-kecil dan spasi di daftar tolak", () => {
    expect(validatePassword("  ADMIN123  ")).toMatch(/daftar tolak/i);
  });
});
