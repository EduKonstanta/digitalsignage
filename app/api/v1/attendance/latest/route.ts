import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function formatJakartaTime(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * Endpoint ini dibaca langsung oleh halaman /display tanpa login atau pairing,
 * jadi siapa pun yang tahu alamatnya bisa memanggilnya. Karena itu jendela
 * pencarian dikunci LIVE_WINDOW_MS ke belakang supaya riwayat presensi tidak
 * bisa disusuri, dan hanya field yang benar-benar tampil di TV yang dikirim.
 */
const LIVE_WINDOW_MS = 2 * 60 * 1000;

/**
 * Beberapa siswa sering menempel kartu berurutan dalam hitungan detik. Endpoint
 * mengembalikan daftar (bukan satu baris terakhir) supaya tidak ada tap yang
 * terlewat di antara dua kali polling; layar menampilkannya satu per satu.
 */
const MAX_EVENTS = 10;

export async function GET(req: NextRequest) {
  try {
    const afterParam = new URL(req.url).searchParams.get("after");
    const after = afterParam ? new Date(afterParam) : new Date();

    if (Number.isNaN(after.getTime())) {
      return apiError("Parameter after tidak valid", "INVALID_AFTER", 400);
    }

    /**
     * Jepit `after` ke jendela [now - LIVE_WINDOW_MS, now] memakai jam server.
     * Batas bawah menutup penyusuran riwayat. Batas atas menutup kasus jam TV
     * yang kedepanan: tanpa itu `after` berada di masa depan dan tidak ada tap
     * yang pernah lolos filter, sehingga layar diam tanpa pesan galat apa pun.
     */
    const serverNow = Date.now();
    const earliestAllowed = new Date(serverNow - LIVE_WINDOW_MS);
    const latestAllowed = new Date(serverNow);
    const effectiveAfter =
      after < earliestAllowed ? earliestAllowed : after > latestAllowed ? latestAllowed : after;

    const attendances = await db.attendanceLog.findMany({
      where: { timestamp: { gt: effectiveAfter } },
      orderBy: { timestamp: "asc" },
      take: MAX_EVENTS,
      include: {
        student: {
          select: {
            nis: true,
            voiceGender: true,
            photoUrl: true,
          },
        },
      },
    });

    return apiSuccess(
      attendances.map((attendance) => ({
        id: attendance.id,
        studentId: attendance.studentId,
        studentName: attendance.studentName,
        nis: attendance.student.nis,
        className: attendance.className,
        voiceGender: attendance.student.voiceGender,
        // cardUid sengaja tidak dikirim: tidak dipakai UI dan merupakan identitas kartu fisik.
        cardUid: null,
        photoUrl: attendance.student.photoUrl,
        type: attendance.type,
        timestamp: attendance.timestamp.toISOString(),
        timeFormatted: formatJakartaTime(attendance.timestamp),
        deviceId: attendance.deviceId,
        fonnteStatus: attendance.fonnteStatus,
        // Nomor telepon tidak ditampilkan di TV, jadi tidak ikut dikirim (walau sudah disamarkan).
        parentPhone: null,
      })),
    );
  } catch (error) {
    return apiError("Gagal mengambil presensi terbaru", "LATEST_ATTENDANCE_ERROR", 500, error);
  }
}
