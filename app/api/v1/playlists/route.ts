import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

const playlistSchema = z.object({
  name: z.string().min(3, "Nama playlist minimal 3 karakter"),
  description: z.string().optional(),
  priority: z.number().int().min(1).max(10).default(1),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const playlists = await db.playlist.findMany({
      include: {
        items: { orderBy: { sequence: "asc" } },
        _count: { select: { items: true, screens: true } },
      },
      orderBy: [{ isActive: "desc" }, { priority: "desc" }, { updatedAt: "desc" }],
    });
    return apiSuccess(playlists);
  } catch (error) {
    return apiError("Gagal mengambil playlist", "PLAYLIST_FETCH_ERROR", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const validated = playlistSchema.parse(await req.json());
    const playlist = await db.playlist.create({
      data: { ...validated, createdById: admin.id },
      include: {
        items: true,
        _count: { select: { items: true, screens: true } },
      },
    });
    await logActivity({
      actorId: admin.id,
      action: "CREATE_PLAYLIST",
      entityType: "Playlist",
      entityId: playlist.id,
      after: playlist,
    });
    return apiSuccess(playlist, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal membuat playlist", "PLAYLIST_CREATE_ERROR", 500, error);
  }
}
