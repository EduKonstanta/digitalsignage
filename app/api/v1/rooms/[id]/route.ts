import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { db } from "@/lib/db";

const roomUpdateSchema = z.object({
  branchId: z.string().min(1, "Cabang wajib dipilih"),
  name: z.string().min(1, "Nama ruangan wajib diisi"),
  floor: z.number().int().min(0),
  capacity: z.number().int().positive().optional(),
  status: z.string().min(1),
  aliases: z.array(z.string()).default([]),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const validated = roomUpdateSchema.parse(await req.json());
    if (!(await db.room.findUnique({ where: { id } }))) {
      return apiError("Ruangan tidak ditemukan", "ROOM_NOT_FOUND", 404);
    }

    const room = await db.room.update({
      where: { id },
      data: { ...validated, aliases: JSON.stringify(validated.aliases) },
      include: {
        branch: true,
        _count: { select: { schedules: true, screens: true } },
      },
    });
    return apiSuccess(room);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal memperbarui ruangan", "ROOM_UPDATE_ERROR", 500, error);
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const room = await db.room.findUnique({
      where: { id },
      include: { _count: { select: { schedules: true, screens: true } } },
    });
    if (!room) return apiError("Ruangan tidak ditemukan", "ROOM_NOT_FOUND", 404);

    const dependencies = [
      room._count.schedules ? `${room._count.schedules} jadwal` : null,
      room._count.screens ? `${room._count.screens} layar` : null,
    ].filter(Boolean);
    if (dependencies.length) {
      return apiError(
        `Ruangan tidak dapat dihapus karena masih digunakan oleh ${dependencies.join(", ")}.`,
        "ROOM_IN_USE",
        409,
      );
    }

    await db.room.delete({ where: { id } });
    return apiSuccess({ id });
  } catch (error) {
    return apiError("Gagal menghapus ruangan", "ROOM_DELETE_ERROR", 500, error);
  }
}
