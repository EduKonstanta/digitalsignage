import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { db } from "@/lib/db";

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
    const { id } = await context.params;
    const validated = playlistSchema.parse(await req.json());
    if (!(await db.playlist.findUnique({ where: { id } }))) {
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
    return apiSuccess({ id });
  } catch (error) {
    return apiError("Gagal menghapus playlist", "PLAYLIST_DELETE_ERROR", 500, error);
  }
}
