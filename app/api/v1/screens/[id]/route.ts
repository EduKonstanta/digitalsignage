import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { getLiveAcademicData } from "@/lib/google-sheets/live-data";

const screenUpdateSchema = z.object({
  name: z.string().min(2, "Nama layar wajib diisi"),
  branchId: z.string().min(1, "Cabang wajib dipilih"),
  roomId: z.string().nullable().optional(),
  resolution: z.string().min(1),
  orientation: z.enum(["LANDSCAPE", "PORTRAIT"]),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await context.params;
    const validated = screenUpdateSchema.parse(await req.json());

    const before = await db.screen.findUnique({ where: { id } });
    if (!before) return apiError("Layar tidak ditemukan", "SCREEN_NOT_FOUND", 404);

    const live = await getLiveAcademicData();
    const branch = live.branches.find((item) => item.id === validated.branchId);
    if (!branch) return apiError("Cabang tidak ditemukan", "BRANCH_NOT_FOUND", 404);

    let room = null;
    if (validated.roomId) {
      room = live.rooms.find((item) => item.id === validated.roomId);
      if (!room) return apiError("Ruangan tidak ditemukan", "ROOM_NOT_FOUND", 404);
    }

    const screen = await db.screen.update({
      where: { id },
      data: {
        name: validated.name,
        branchId: validated.branchId,
        roomId: validated.roomId ?? null,
        resolution: validated.resolution,
        orientation: validated.orientation,
      },
    });
    const enriched = { ...screen, branch, room };

    await logActivity({
      actorId: admin.id,
      action: "UPDATE_SCREEN",
      entityType: "Screen",
      entityId: id,
      before,
      after: enriched,
    });

    return apiSuccess(enriched);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal memperbarui layar", "SCREEN_UPDATE_ERROR", 500, error);
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await context.params;
    const screen = await db.screen.findUnique({ where: { id } });
    if (!screen) return apiError("Layar tidak ditemukan", "SCREEN_NOT_FOUND", 404);

    // Soft delete mengikuti pola revokedAt yang dipakai GET /screens dan route
    // display. Hard delete ikut menghapus riwayat heartbeat (onDelete: Cascade).
    await db.screen.update({
      where: { id },
      data: { revokedAt: new Date(), status: "OFFLINE" },
    });

    await logActivity({
      actorId: admin.id,
      action: "DELETE_SCREEN",
      entityType: "Screen",
      entityId: id,
      before: screen,
    });

    return apiSuccess({ id });
  } catch (error) {
    return apiError("Gagal menghapus layar", "SCREEN_DELETE_ERROR", 500, error);
  }
}
