/**
 * Pembacaan secret dari environment yang menolak nilai contoh.
 *
 * DEPLOYMENT.md menyuruh operator menyalin `.env.example` menjadi `.env`, dan
 * berkas itu berisi nilai seperti "replace-with-a-random-cron-secret". Tanpa
 * penyaringan ini, nilai contoh tersebut menjadi secret yang sah — padahal
 * isinya terbuka di repositori, sehingga siapa pun bisa memicu penghapusan data
 * terjadwal atau mengirim presensi palsu pada instalasi yang lupa mengisinya.
 *
 * Nilai contoh karena itu diperlakukan sama seperti belum diisi sama sekali,
 * sehingga penjagaan yang sudah ada ikut menutup pintunya.
 */

const PLACEHOLDER_PATTERN = /^replace-with-/i;

const warned = new Set<string>();

export function readSecret(name: string): string | null {
  const raw = process.env[name]?.trim();
  if (!raw) return null;

  if (PLACEHOLDER_PATTERN.test(raw)) {
    if (!warned.has(name)) {
      warned.add(name);
      console.warn(
        `${name} masih berisi nilai contoh dari .env.example, jadi diperlakukan ` +
          "sebagai belum diatur. Isi dengan nilai acak sungguhan.",
      );
    }
    return null;
  }

  return raw;
}
