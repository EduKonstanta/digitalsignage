/**
 * Aturan password admin, dipakai bersama oleh seed database dan endpoint ganti
 * password. Disatukan di sini supaya keduanya tidak pernah berbeda aturan —
 * percuma seed menolak password lemah bila lewat aplikasi masih bisa dipasang.
 */

export const MIN_PASSWORD_LENGTH = 12;

/**
 * Password yang tidak boleh dipakai di mana pun. `admin123` adalah bekas nilai
 * bawaan seed, dan `replace-with-a-strong-password` adalah isi `.env.example`
 * yang disalin apa adanya oleh panduan instalasi.
 */
export const REJECTED_PASSWORDS = new Set([
  "admin123",
  "replace-with-a-strong-password",
  "password",
  "admin",
  "12345678",
  "konstanta",
]);

/** Pesan galat berbahasa Indonesia, atau null bila password memenuhi syarat. */
export function validatePassword(password: string): string | null {
  const trimmed = password.trim();

  if (!trimmed) return "Password baru wajib diisi.";

  if (REJECTED_PASSWORDS.has(trimmed.toLowerCase())) {
    return "Password itu terlalu umum dan sudah masuk daftar tolak. Pilih yang lain.";
  }

  if (trimmed.length < MIN_PASSWORD_LENGTH) {
    return `Password baru minimal ${MIN_PASSWORD_LENGTH} karakter (sekarang ${trimmed.length}).`;
  }

  return null;
}
