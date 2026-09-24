import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLiveAcademicData } from "@/lib/google-sheets/live-data";
import { createRoom } from "@/lib/academic-store";
import { z } from "zod";

const roomSchema = z.object({
  branchId: z.string().min(1, "Cabang wajib dipilih"),
  name: z.string().min(1, "Nama ruangan wajib diisi"),
  code: z.string().optional(),
  floor: z.number().int().min(0).default(1),
  capacity: z.number().int().min(1).optional().nullable(),
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE"]).default("AVAILABLE"),
  aliases: z.union([z.string(), z.array(z.string())]).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");

    const [live, screens] = await Promise.all([
      getLiveAcademicData(),
      db.screen.findMany({ select: { roomId: true } }),
    ]);

    const rooms = live.rooms
      .filter((room) => !branchId || room.branchId === branchId)
      .slice()
      .sort((a, b) => a.branchId.localeCompare(b.branchId) || a.floor - b.floor || a.name.localeCompare(b.name, "id-ID"))
      .map((room) => ({
        ...room,
        _count: {
          schedules: live.schedules.filter((schedule) => schedule.roomId === room.id).length,
          screens: screens.filter((screen) => screen.roomId === room.id).length,
        },
      }));

    return apiSuccess(rooms);
  } catch (error) {
    return apiError("Gagal mengambil data ruangan", "ROOM_FETCH_ERROR", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const body = await req.json();
    const validated = roomSchema.parse(body);

    const room = await createRoom(
      {
        branchId: validated.branchId,
        name: validated.name.trim(),
        code: validated.code?.trim().toUpperCase(),
        floor: validated.floor,
        capacity: validated.capacity,
        status: validated.status,
        aliases: validated.aliases,
      },
      admin.id,
    );

    return apiSuccess(room, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal menambah ruangan", "ROOM_CREATE_ERROR", 500, error);
  }
}
