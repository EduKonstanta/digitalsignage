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
