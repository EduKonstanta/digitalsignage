/**
 * Bentuk kanonik UID kartu RFID: hanya huruf dan angka, huruf besar.
 *
 * Pembaca kartu berbeda-beda cara menulis UID yang sama: "978C9877",
 * "97:8C:98:77", "97-8c-98-77", "97 8C 98 77" atau huruf kecil. Tanpa
 * penyeragaman, siswa yang sudah terdaftar tetap ditolak sebagai "tidak
 * terdaftar" hanya karena format tulisannya berbeda.
 */
export function canonicalCardUid(value: string): string {
  return value.replace(/[^0-9a-z]/gi, "").toUpperCase();
}

/**
 * Bentuk yang aman dan mudah dibaca di layar display. UID pendek tetap utuh
 * supaya operator bisa mencocokkan kartu saat setup; UID panjang disingkat agar
 * tidak terlalu banyak membuka identitas kartu fisik di area publik.
 */
export function displayCardUid(value: string | null | undefined): string | null {
  if (!value) return null;
  const canonical = canonicalCardUid(value);
  if (!canonical) return null;
  if (canonical.length <= 8) return canonical;
  return `${canonical.slice(0, 4)}...${canonical.slice(-4)}`;
}

/**
 * Cari pemilik kartu dengan membandingkan bentuk kanonik. Hasil hanya diberikan
 * bila tepat satu siswa yang cocok; dua kartu berbeda yang menyeragam ke UID
 * yang sama dianggap ambigu dan ditolak daripada salah mencatat presensi.
 */
export function findByCardUid<T extends { cardUid: string | null }>(
  students: readonly T[],
  uid: string,
): T | null {
  const wanted = canonicalCardUid(uid);
  if (!wanted) return null;

  const matches = students.filter(
    (student) => student.cardUid && canonicalCardUid(student.cardUid) === wanted,
  );
  return matches.length === 1 ? matches[0] : null;
}
