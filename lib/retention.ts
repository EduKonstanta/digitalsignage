import { db } from "@/lib/db";

/**
 * Kebijakan retensi data. Tidak ada satu pun tabel log yang sebelumnya pernah
 * dibersihkan, sehingga ActivityLog (menyimpan JSON penuh record sebelum dan
 * sesudah tiap aksi admin) dan sesi kedaluwarsa tumbuh tanpa batas.
 *
 * Ubah angka di bawah untuk menyesuaikan masa simpan. Nilai dalam hari.
 */
export const RETENTION_DAYS = {
  /** Jejak audit aksi admin. */
  activityLog: 90,
  /**
   * Hanya kolom `fonnteResponse` (JSON mentah balasan Fonnte, ±0,5–1 KB per
   * baris) yang dikosongkan. Baris presensinya sendiri TIDAK pernah dihapus
   * karena merupakan catatan kehadiran siswa; status dan message id tetap utuh.
   */
  attendanceFonnteResponse: 30,
  /** Sesi login yang sudah kedaluwarsa atau dicabut. */
  authSession: 30,
  /** Token reset password yang sudah terpakai atau kedaluwarsa. */
  passwordResetToken: 7,
  /** Heartbeat perangkat layar. */
  deviceHeartbeat: 7,
  /** Riwayat pemutaran pengumuman suara. */
  voicePlaybackLog: 90,
} as const;

export interface RetentionResult {
  activityLogDeleted: number;
  attendanceResponsesCleared: number;
  authSessionsDeleted: number;
  passwordResetTokensDeleted: number;
  deviceHeartbeatsDeleted: number;
  voicePlaybackLogsDeleted: number;
  ranAt: string;
}

function cutoff(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * Membersihkan data lama sesuai RETENTION_DAYS. Aman dijalankan berulang kali:
 * setiap langkah hanya menyentuh baris yang sudah melewati batas simpannya.
 */
export async function runRetentionCleanup(): Promise<RetentionResult> {
  const now = new Date();

  const [
    activityLog,
    attendanceResponses,
    authSessions,
    passwordResetTokens,
    deviceHeartbeats,
    voicePlaybackLogs,
  ] = await Promise.all([
    db.activityLog.deleteMany({
      where: { createdAt: { lt: cutoff(RETENTION_DAYS.activityLog) } },
    }),

    // Kosongkan blob balasan Fonnte, pertahankan barisnya.
    db.attendanceLog.updateMany({
      where: {
        timestamp: { lt: cutoff(RETENTION_DAYS.attendanceFonnteResponse) },
        fonnteResponse: { not: null },
      },
      data: { fonnteResponse: null },
    }),

    // Sesi yang sudah kedaluwarsa atau dicabut, dan sudah lewat masa simpan.
    db.authSession.deleteMany({
      where: {
        AND: [
          { createdAt: { lt: cutoff(RETENTION_DAYS.authSession) } },
          {
            OR: [{ expiresAt: { lt: now } }, { revokedAt: { not: null } }],
          },
        ],
      },
    }),

    db.passwordResetToken.deleteMany({
      where: {
        AND: [
          { createdAt: { lt: cutoff(RETENTION_DAYS.passwordResetToken) } },
          {
            OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }],
          },
        ],
      },
    }),

    db.deviceHeartbeat.deleteMany({
      where: { serverReceivedAt: { lt: cutoff(RETENTION_DAYS.deviceHeartbeat) } },
    }),

    db.voicePlaybackLog.deleteMany({
      where: { startedAt: { lt: cutoff(RETENTION_DAYS.voicePlaybackLog) } },
    }),
  ]);

  return {
    activityLogDeleted: activityLog.count,
    attendanceResponsesCleared: attendanceResponses.count,
    authSessionsDeleted: authSessions.count,
    passwordResetTokensDeleted: passwordResetTokens.count,
    deviceHeartbeatsDeleted: deviceHeartbeats.count,
    voicePlaybackLogsDeleted: voicePlaybackLogs.count,
    ranAt: now.toISOString(),
  };
}
