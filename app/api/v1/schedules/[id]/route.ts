import { NextRequest } from "next/server";
import { ScheduleManualStatus } from "@/domain/schedule-status";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { updateSchedule, deleteSchedule } from "@/lib/academic-store";
import { getLiveAcademicData } from "@/lib/google-sheets/live-data";
import { z } from "zod";

/** Dua bentang waktu bertabrakan? Dipakai untuk cek ruangan & tutor. */
function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart;
}

const updateScheduleSchema = z.object({
  branchId: z.string().optional(),
  programId: z.string().optional(),
  classId: z.string().optional(),
  subjectId: z.string().optional(),
  tutorId: z.string().optional(),
  roomId: z.string().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  manualStatus: z
    .enum(["NONE", "DELAYED", "CANCELLED", "MOVED_ROOM", "ONLINE"])
    .optional(),
  notes: z.string().optional().nullable(),
});

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handleUpdate(req, context);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handleUpdate(req, context);
}

async function handleUpdate(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await context.params;
    const body = await req.json();
    const validated = updateScheduleSchema.parse(body);

    // Validasi yang sama seperti POST: tanpa ini, edit jadwal bisa membuat
    // ruangan/tutor dobel-booking atau jam selesai mendahului jam mulai.
    if (validated.startAt || validated.endAt || validated.roomId || validated.tutorId) {
      const live = await getLiveAcademicData();
      const existing = live.schedules.find((schedule) => schedule.id === id);

      if (!existing) {
        return apiError("Jadwal tidak ditemukan", "SCHEDULE_NOT_FOUND", 404);
      }

      const startAt = validated.startAt ? new Date(validated.startAt) : existing.startAt;
      const endAt = validated.endAt ? new Date(validated.endAt) : existing.endAt;
      const roomId = validated.roomId ?? existing.roomId;
      const tutorId = validated.tutorId ?? existing.tutorId;
      const manualStatus = validated.manualStatus ?? existing.manualStatus;

      if (endAt <= startAt) {
        return apiError(
          "Waktu selesai harus lebih besar dari waktu mulai",
          "INVALID_TIME_RANGE",
          400,
        );
      }

      if (manualStatus !== "CANCELLED") {
        const others = live.schedules.filter(
          (schedule) => schedule.id !== id && schedule.manualStatus !== "CANCELLED",
        );

        const roomConflict = others.find(
          (schedule) =>
            schedule.roomId === roomId &&
            overlaps(
              startAt.getTime(),
              endAt.getTime(),
              schedule.startAt.getTime(),
              schedule.endAt.getTime(),
            ),
        );
        if (roomConflict) {
          return apiError(
            "Ruangan yang dipilih sudah digunakan pada bentang waktu tersebut",
            "ROOM_CONFLICT",
            409,
          );
        }

        const tutorConflict = others.find(
          (schedule) =>
            schedule.tutorId === tutorId &&
            overlaps(
              startAt.getTime(),
              endAt.getTime(),
              schedule.startAt.getTime(),
              schedule.endAt.getTime(),
            ),
        );
        if (tutorConflict) {
          return apiError(
            "Tutor/KangGuru sudah mengajar di kelas lain pada bentang waktu tersebut",
            "TUTOR_CONFLICT",
            409,
          );
        }
      }
    }

    const updated = await updateSchedule(
      id,
      {
        ...(validated.branchId ? { branchId: validated.branchId } : {}),
        ...(validated.programId ? { programId: validated.programId } : {}),
        ...(validated.classId ? { classId: validated.classId } : {}),
        ...(validated.subjectId ? { subjectId: validated.subjectId } : {}),
        ...(validated.tutorId ? { tutorId: validated.tutorId } : {}),
        ...(validated.roomId ? { roomId: validated.roomId } : {}),
        ...(validated.startAt ? { startAt: validated.startAt } : {}),
        ...(validated.endAt ? { endAt: validated.endAt } : {}),
        ...(validated.manualStatus
          ? { manualStatus: validated.manualStatus as ScheduleManualStatus }
          : {}),
        ...(validated.notes !== undefined ? { notes: validated.notes } : {}),
      },
      admin.id,
    );

    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal memperbarui jadwal", "SCHEDULE_UPDATE_ERROR", 500, error);
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await context.params;
    await deleteSchedule(id, admin.id);

    return apiSuccess({ id });
  } catch (error) {
    return apiError("Gagal menghapus jadwal", "SCHEDULE_DELETE_ERROR", 500, error);
  }
}
