import { NextRequest } from "next/server";
import { computeScheduleStatus, ScheduleManualStatus } from "@/domain/schedule-status";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { getLiveAcademicData } from "@/lib/google-sheets/live-data";
import { createClass, createSchedule } from "@/lib/academic-store";
import { z } from "zod";

const scheduleSchema = z.object({
  branchId: z.string().min(1, "Cabang wajib dipilih"),
  programId: z.string().min(1, "Program wajib dipilih"),
  classId: z.string().trim().optional(),
  className: z.string().trim().optional(),
  subjectId: z.string().min(1, "Mata pelajaran wajib dipilih"),
  tutorId: z.string().min(1, "Tutor wajib dipilih"),
  roomId: z.string().min(1, "Ruangan wajib dipilih"),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  manualStatus: z
    .enum(["NONE", "DELAYED", "CANCELLED", "MOVED_ROOM", "ONLINE"])
    .default("NONE"),
  notes: z.string().optional().nullable(),
});

function isElcProgram(programName: string) {
  return programName.trim().toUpperCase() === "ELC";
}

function normalizedName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const roomId = searchParams.get("roomId");
    const date = searchParams.get("date"); // YYYY-MM-DD

    // Batas hari mengikuti WIB, sama seperti /api/v1/display. Memakai batas UTC
    // membuat kelas 00:00-06:59 WIB masuk ke hari yang salah di dashboard.
    const dayStart = date ? new Date(`${date}T00:00:00+07:00`) : null;
    const dayEnd = date ? new Date(`${date}T23:59:59.999+07:00`) : null;

    const live = await getLiveAcademicData();

    const now = new Date();
    const schedules = live.schedules
      .filter((schedule) => !branchId || schedule.branchId === branchId)
      .filter((schedule) => !roomId || schedule.roomId === roomId)
      .filter((schedule) => !dayStart || !dayEnd || (schedule.startAt >= dayStart && schedule.startAt <= dayEnd))
      .slice()
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
      .map((schedule) => ({
        ...schedule,
        computedStatus: computeScheduleStatus({
          startAt: schedule.startAt,
          endAt: schedule.endAt,
          manualStatus: schedule.manualStatus,
          now,
        }),
      }));

    return apiSuccess(schedules);
  } catch (error) {
    return apiError("Gagal mengambil daftar jadwal", "SCHEDULE_FETCH_ERROR", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const body = await req.json();
    const validated = scheduleSchema.parse(body);

    const startAt = new Date(validated.startAt);
    const endAt = new Date(validated.endAt);

    if (endAt <= startAt) {
      return apiError(
        "Waktu selesai harus lebih besar dari waktu mulai",
        "INVALID_TIME_RANGE",
        400,
      );
    }

    const live = await getLiveAcademicData();
    const program = live.programs.find((p) => p.id === validated.programId);

    if (!program) {
      return apiError("Program tidak ditemukan", "PROGRAM_NOT_FOUND", 400);
    }

    let classId = validated.classId || "";
    let pendingClassName: string | null = null;

    if (isElcProgram(program.name)) {
      if (!classId) {
        return apiError("Kelas wajib dipilih", "CLASS_REQUIRED", 400);
      }

      const klass = live.classes.find((c) => c.id === classId && c.programId === validated.programId);
      if (!klass) {
        return apiError("Kelas tidak ditemukan untuk program yang dipilih", "CLASS_NOT_FOUND", 400);
      }
    } else {
      const className = validated.className?.trim().replace(/\s+/g, " ");
      if (!className) {
        return apiError("Nama siswa wajib diisi", "STUDENT_NAME_REQUIRED", 400);
      }

      const existingClass = live.classes.find(
        (c) => c.programId === validated.programId && normalizedName(c.name) === normalizedName(className),
      );
      classId = existingClass?.id ?? "";
      pendingClassName = existingClass ? null : className;
    }

    // Check Room Conflict
    const roomConflict = live.schedules.find((s) => {
      if (s.roomId !== validated.roomId) return false;
      if (s.manualStatus === "CANCELLED") return false;
      const sStart = s.startAt.getTime();
      const sEnd = s.endAt.getTime();
      const nStart = startAt.getTime();
      const nEnd = endAt.getTime();
      return (
        (nStart >= sStart && nStart < sEnd) ||
        (nEnd > sStart && nEnd <= sEnd) ||
        (nStart <= sStart && nEnd >= sEnd)
      );
    });

    if (roomConflict) {
      return apiError(
        "Ruangan yang dipilih sudah digunakan pada bentang waktu tersebut",
        "ROOM_CONFLICT",
        409,
      );
    }

    // Check Tutor Conflict
    const tutorConflict = live.schedules.find((s) => {
      if (s.tutorId !== validated.tutorId) return false;
      if (s.manualStatus === "CANCELLED") return false;
      const sStart = s.startAt.getTime();
      const sEnd = s.endAt.getTime();
      const nStart = startAt.getTime();
      const nEnd = endAt.getTime();
      return (
        (nStart >= sStart && nStart < sEnd) ||
        (nEnd > sStart && nEnd <= sEnd) ||
        (nStart <= sStart && nEnd >= sEnd)
      );
    });

    if (tutorConflict) {
      return apiError(
        "Tutor/KangGuru sudah mengajar di kelas lain pada bentang waktu tersebut",
        "TUTOR_CONFLICT",
        409,
      );
    }

    if (!classId && pendingClassName) {
      classId = (
        await createClass(
          {
            programId: validated.programId,
            name: pendingClassName,
          },
          admin.id,
        )
      ).id;
    }

    const schedule = await createSchedule(
      {
        branchId: validated.branchId,
        programId: validated.programId,
        classId,
        subjectId: validated.subjectId,
        tutorId: validated.tutorId,
        roomId: validated.roomId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        manualStatus: validated.manualStatus as ScheduleManualStatus,
        notes: validated.notes || null,
      },
      admin.id,
    );

    return apiSuccess(schedule, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal membuat jadwal baru", "SCHEDULE_CREATE_ERROR", 500, error);
  }
}
