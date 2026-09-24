import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

const playlistSchema = z.object({
  name: z.string().min(3, "Nama playlist minimal 3 karakter"),
  description: z.string().optional(),
  priority: z.number().int().min(1).max(10),
  isActive: z.boolean(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await context.params;
    const validated = playlistSchema.parse(await req.json());
    const before = await db.playlist.findUnique({ where: { id } });
    if (!before) {
      return apiError("Playlist tidak ditemukan", "PLAYLIST_NOT_FOUND", 404);
    }
    const playlist = await db.playlist.update({
      where: { id },
      data: { ...validated, version: { increment: 1 } },
      include: {
        items: { orderBy: { sequence: "asc" } },
        _count: { select: { items: true, screens: true } },
      },
    });
    await logActivity({
      actorId: admin.id,
      action: "UPDATE_PLAYLIST",
      entityType: "Playlist",
      entityId: id,
      before,
      after: playlist,
    });
    return apiSuccess(playlist);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal memperbarui playlist", "PLAYLIST_UPDATE_ERROR", 500, error);
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await context.params;
    const playlist = await db.playlist.findUnique({
      where: { id },
      include: { _count: { select: { screens: true } } },
    });
    if (!playlist) {
      return apiError("Playlist tidak ditemukan", "PLAYLIST_NOT_FOUND", 404);
    }
    if (playlist._count.screens > 0) {
      return apiError(
        `Playlist masih digunakan oleh ${playlist._count.screens} layar. Lepaskan dari layar terlebih dahulu.`,
        "PLAYLIST_IN_USE",
        409,
      );
    }
    await db.playlist.delete({ where: { id } });
    await logActivity({
      actorId: admin.id,
      action: "DELETE_PLAYLIST",
      entityType: "Playlist",
      entityId: id,
      before: playlist,
    });
    return apiSuccess({ id });
  } catch (error) {
    return apiError("Gagal menghapus playlist", "PLAYLIST_DELETE_ERROR", 500, error);
  }
}
