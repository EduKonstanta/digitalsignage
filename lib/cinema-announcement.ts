export interface ScheduleAnnouncementData {
  className?: string;
  subject?: string;
  teacher?: string;
  room?: string;
  startAt?: string;
}

/**
 * Modern, punchy, Gen-Z styled announcement for 10 minutes pre-class warning.
 */
export function formatPreClassAnnouncementText(data: ScheduleAnnouncementData): string {
  const room = data.room || "Ruang Kelas";
  const subject = data.subject || "Pelajaran";
  const className = data.className || "Siswa";
  const teacher = data.teacher || "Pengajar";

  return `Halo Guys! 10 menit lagi kelas ${subject} ${className} bareng ${teacher} di ${room} bakal dimulai nih. Yuk langsung masuk ruangan, siapin materi, dan tetap semangat kejar kampus impianmu. Let's go!`;
}

export interface AttendanceAnnouncementData {
  studentName: string;
  type: "CHECK_IN" | "CHECK_OUT";
  /** Penentu variasi kalimat (mis. id presensi), supaya tap berurutan tidak terdengar sama. */
  seed?: string;
}

/**
 * Nama siswa di Sheet/database sering tertulis KAPITAL SEMUA. Beberapa mesin
 * suara mengejanya huruf demi huruf, jadi nama yang seluruhnya kapital diubah
 * ke huruf awal kapital sebelum diucapkan. Nama yang sudah campuran dibiarkan.
 */
export function toSpokenName(name: string): string {
  const clean = name.trim().replace(/\s+/g, " ");
  if (clean !== clean.toUpperCase()) return clean;
  return clean
    .toLowerCase()
    .replace(/(^|[\s\-'.])(\p{L})/gu, (_match, lead: string, letter: string) => lead + letter.toUpperCase());
}

function pickVariant(seed: string | undefined, count: number) {
  if (!seed) return 0;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash % count;
}

/**
 * Sapaan presensi ala anak Jaksel (campur Indonesia-Inggris). Kalimat inti
 * tetap "<nama> telah hadir ... semangat belajar" dengan sedikit variasi.
 */
export function formatAttendanceAnnouncementText(data: AttendanceAnnouncementData): string {
  const name = toSpokenName(data.studentName);

  if (data.type === "CHECK_OUT") {
    return `Nice work, ${name}! Sesi belajar kamu hari ini officially done. Hati-hati di jalan, and see you next time!`;
  }

  const variants = [
    `Hai guys! ${name} telah hadir di Konstanta Education. Semangat belajar ya, literally kamu pasti bisa. Let's go!`,
    `${name} telah hadir nih di Konstanta Education. Which is keren banget! Semangat belajar ya, make it count!`,
    `Welcome, ${name}! Kamu telah hadir di Konstanta Education. Semangat belajar ya, let's make today super productive!`,
  ];
  return variants[pickVariant(data.seed, variants.length)];
}
