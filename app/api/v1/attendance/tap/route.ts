import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api-response";
import { broadcastAttendanceTap } from "@/lib/attendance-events";
import { isAuthorizedAttendanceDevice } from "@/lib/attendance-auth";
import {
  formatAttendanceMessage,
  getFonnteConfig,
  sendFonnteWhatsApp,
} from "@/lib/fonnte";

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

function formatJakartaDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function startOfJakartaDay(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(`${values.year}-${values.month}-${values.day}T00:00:00+07:00`);
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorizedAttendanceDevice(req)) {
      return apiError("Perangkat presensi tidak terautentikasi", "UNAUTHORIZED_DEVICE", 401);
    }

    const body = await req.json().catch(() => ({}));
    const {
      cardUid,
      nis,
      deviceId = "KIOSK-LOBBY-01",
      type,
    } = body as {
      cardUid?: string;
      nis?: string;
      deviceId?: string;
      type?: "CHECK_IN" | "CHECK_OUT";
    };

    const trimmedCard = cardUid?.trim();
    const trimmedNis = nis?.trim();

    if (!trimmedCard && !trimmedNis) {
      return apiError(
        "Harap sertakan UID kartu (cardUid) atau NIS siswa",
        "INVALID_REQUEST",
        400
      );
    }

    if (type && type !== "CHECK_IN" && type !== "CHECK_OUT") {
      return apiError("Tipe presensi harus CHECK_IN atau CHECK_OUT", "INVALID_ATTENDANCE_TYPE", 400);
    }

    // 1. Find Student by Card UID or NIS
    const student = await db.student.findFirst({
      where: {
        OR: [
          ...(trimmedCard ? [{ cardUid: trimmedCard }] : []),
          ...(trimmedNis ? [{ nis: trimmedNis }] : []),
        ],
        isActive: true,
      },
    });

    if (!student) {
      return apiError(
        `Kartu atau NIS (${trimmedCard || trimmedNis}) tidak terdaftar dalam sistem siswa aktif.`,
        "STUDENT_NOT_FOUND",
        404
      );
    }

    const now = new Date();
    const timeFormatted = formatJakartaTime(now);
    const dateFormatted = formatJakartaDate(now);

    // 2. Determine Attendance Type (Check-In or Check-Out) if not explicitly supplied
    let attendanceType: "CHECK_IN" | "CHECK_OUT";
    if (type) {
      attendanceType = type;
    } else {
      // If student already checked in today, default next tap to check out
      const startOfDay = startOfJakartaDay(now);

      const latestToday = await db.attendanceLog.findFirst({
        where: {
          studentId: student.id,
          timestamp: { gte: startOfDay },
        },
        orderBy: { timestamp: "desc" },
      });

      attendanceType = latestToday?.type === "CHECK_IN" ? "CHECK_OUT" : "CHECK_IN";
    }

    // Debounce tap ganda dalam 10 detik. Tipe ikut dibandingkan supaya
    // CHECK_OUT yang sah tepat setelah CHECK_IN tidak ikut tertelan.
    const tenSecondsAgo = new Date(now.getTime() - 10 * 1000);
    const recentDuplicate = await db.attendanceLog.findFirst({
      where: {
        studentId: student.id,
        type: attendanceType,
        timestamp: { gte: tenSecondsAgo },
      },
    });

    if (recentDuplicate) {
      return apiSuccess(
        {
          duplicate: true,
          student: {
            id: student.id,
            name: student.name,
            nis: student.nis,
            className: student.className,
            photoUrl: student.photoUrl,
          },
          attendance: recentDuplicate,
          message: "Kartu baru saja di-tap beberapa detik yang lalu.",
        },
        undefined
      );
    }

    const fonnteConfig = await getFonnteConfig();
    const parentPhone = student.parentPhone || student.studentPhone;
    const initialFonnteStatus = !parentPhone
      ? "SKIPPED"
      : fonnteConfig.isEnabled && fonnteConfig.token
        ? "QUEUED"
        : "DISABLED";

    // 3. Create Attendance Log Record
    const attendance = await db.attendanceLog.create({
      data: {
        studentId: student.id,
        studentName: student.name,
        className: student.className,
        cardUid: student.cardUid || trimmedCard || null,
        type: attendanceType,
        timestamp: now,
        deviceId,
        fonnteStatus: initialFonnteStatus,
        fonnteResponse:
          initialFonnteStatus === "SKIPPED"
            ? "Nomor WhatsApp orang tua belum diisi"
            : initialFonnteStatus === "DISABLED"
              ? "Integrasi WhatsApp Fonnte dinonaktifkan di pengaturan"
              : null,
      },
    });

    let fonnteStatus: "QUEUED" | "FAILED" | "DISABLED" | "SKIPPED" = initialFonnteStatus;
    let fonnteError: string | undefined;

    // 4. Broadcast immediately so the signage is not delayed by the WhatsApp API.
    broadcastAttendanceTap({
      id: attendance.id,
      studentId: student.id,
      studentName: student.name,
      nis: student.nis,
      className: student.className,
      voiceGender: student.voiceGender as "AUTO" | "MALE" | "FEMALE",
      // Event ini dibaca /display tanpa login, jadi UID kartu fisik dan nomor
      // telepon tidak ikut dipancarkan (sama seperti /attendance/latest).
      cardUid: null,
      photoUrl: student.photoUrl,
      type: attendanceType,
      timestamp: now.toISOString(),
      timeFormatted,
      deviceId,
      fonnteStatus,
      parentPhone: null,
    });

    if (fonnteConfig.isEnabled && fonnteConfig.token && parentPhone) {
      const template =
        attendanceType === "CHECK_OUT"
          ? fonnteConfig.templateCheckOut
          : fonnteConfig.templateCheckIn;

      const message = formatAttendanceMessage({
        template,
        studentName: student.name,
        nis: student.nis,
        className: student.className,
        timeStr: timeFormatted,
        dateStr: dateFormatted,
        type: attendanceType,
      });

      // Send WhatsApp message via Fonnte API
      const waResult = await sendFonnteWhatsApp({
        target: parentPhone,
        message,
        countryCode: fonnteConfig.countryCode,
      });

      fonnteStatus = waResult.success ? "QUEUED" : "FAILED";
      fonnteError = waResult.error;

      // Update Attendance Log with Fonnte Status
      await db.attendanceLog.update({
        where: { id: attendance.id },
        data: {
          fonnteStatus,
          fonnteMessageId: waResult.messageId,
          fonnteResponse: waResult.response ? JSON.stringify(waResult.response) : waResult.error,
          fonnteUpdatedAt: new Date(),
        },
      });
    }

    return apiSuccess({
      student: {
        id: student.id,
        name: student.name,
        nis: student.nis,
        className: student.className,
        photoUrl: student.photoUrl,
      },
      attendance: {
        id: attendance.id,
        type: attendanceType,
        timestamp: now.toISOString(),
        timeFormatted,
        dateFormatted,
      },
      fonnte: {
        status: fonnteStatus,
        error: fonnteError,
      },
    });
  } catch (error) {
    console.error("Attendance tap processing error:", error);
    return apiError(
      "Gagal memproses presensi siswa",
      "ATTENDANCE_PROCESS_ERROR",
      500,
      error
    );
  }
}
