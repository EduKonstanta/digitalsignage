import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { computeScheduleStatus, ScheduleManualStatus } from "@/domain/schedule-status";
import { z } from "zod";

const scheduleSchema = z.object({
  branchId: z.string().min(1, "Branch ID required"),
  programId: z.string().min(1, "Program ID required"),
  classId: z.string().min(1, "Class ID required"),
  subjectId: z.string().min(1, "Subject ID required"),
  tutorId: z.string().min(1, "Tutor ID required"),
  roomId: z.string().min(1, "Room ID required"),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  manualStatus: z.enum(["NONE", "DELAYED", "CANCELLED", "MOVED_ROOM", "ONLINE"]).default("NONE"),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const roomId = searchParams.get("roomId");
    const date = searchParams.get("date"); // YYYY-MM-DD

    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (roomId) where.roomId = roomId;

    if (date) {
      const dayStart = new Date(`${date}T00:00:00.000Z`);
      const dayEnd = new Date(`${date}T23:59:59.999Z`);
      where.startAt = { gte: dayStart, lte: dayEnd };
    }

    const schedules = await db.schedule.findMany({
      where,
      include: {
        branch: true,
        program: true,
        class: true,
        subject: true,
        tutor: true,
        room: true,
      },
      orderBy: { startAt: "asc" },
    });

    const now = new Date();
    const enriched = schedules.map((sch) => ({
      ...sch,
      computedStatus: computeScheduleStatus({
        startAt: sch.startAt,
        endAt: sch.endAt,
        manualStatus: sch.manualStatus as ScheduleManualStatus,
        now,
      }),
    }));

    return apiSuccess(enriched);
  } catch (error) {
    return apiError("Gagal mengambil daftar jadwal", "SCHEDULE_FETCH_ERROR", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = scheduleSchema.parse(body);

    const startAt = new Date(validated.startAt);
    const endAt = new Date(validated.endAt);

    if (endAt <= startAt) {
      return apiError("Waktu selesai harus lebih besar dari waktu mulai", "INVALID_TIME_RANGE", 400);
    }

    // Conflict Check 1: Room Double-Booking
    const roomConflict = await db.schedule.findFirst({
      where: {
        roomId: validated.roomId,
        archivedAt: null,
        manualStatus: { not: "CANCELLED" },
        OR: [
          { startAt: { lte: startAt }, endAt: { gt: startAt } },
          { startAt: { lt: endAt }, endAt: { gte: endAt } },
          { startAt: { gte: startAt }, endAt: { lte: endAt } },
        ],
      },
    });

    if (roomConflict) {
      return apiError("Ruangan yang dipilih sudah digunakan pada bentang waktu tersebut", "ROOM_CONFLICT", 409);
    }

    // Conflict Check 2: Tutor Double-Booking
    const tutorConflict = await db.schedule.findFirst({
      where: {
        tutorId: validated.tutorId,
        archivedAt: null,
        manualStatus: { not: "CANCELLED" },
        OR: [
          { startAt: { lte: startAt }, endAt: { gt: startAt } },
          { startAt: { lt: endAt }, endAt: { gte: endAt } },
          { startAt: { gte: startAt }, endAt: { lte: endAt } },
        ],
      },
    });

    if (tutorConflict) {
      return apiError("Tutor/KangGuru sudah mengajar di kelas lain pada bentang waktu tersebut", "TUTOR_CONFLICT", 409);
    }

    const schedule = await db.schedule.create({
      data: {
        ...validated,
        startAt,
        endAt,
        publishedAt: new Date(),
      },
    });

    return apiSuccess(schedule, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal membuat jadwal baru", "SCHEDULE_CREATE_ERROR", 500, error);
  }
}
