import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

const mediaUpdateSchema = z
  .object({
    name: z.string().min(2),
    mediaType: z.enum([
      "IMAGE",
      "VIDEO",
      "AUDIO",
      "YOUTUBE",
      "INSTAGRAM",
      "TIKTOK",
      "GOOGLE_DRIVE",
      "GOOGLE_SLIDES",
      "CANVA",
      "WEB_EMBED",
    ]),
    fileUrl: z.string().optional(),
    externalUrl: z.string().optional(),
    thumbnailUrl: z.string().optional(),
    durationSeconds: z.number().int().min(1).max(3600),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    mimeType: z.string().optional(),
    tags: z.array(z.string()).default([]),
    status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "EXPIRED", "ARCHIVED"]),
  })
  .refine((data) => Boolean(data.fileUrl?.trim() || data.externalUrl?.trim()), {
    message: "Isi URL utama/path file, atau URL eksternal/sematan untuk embed",
    path: ["fileUrl"],
  });

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await context.params;
    const validated = mediaUpdateSchema.parse(await req.json());
    const before = await db.mediaAsset.findUnique({ where: { id } });
    if (!before) {
      return apiError("Media tidak ditemukan", "MEDIA_NOT_FOUND", 404);
    }
    const media = await db.mediaAsset.update({
      where: { id },
      data: { ...validated, tags: JSON.stringify(validated.tags) },
    });
    await logActivity({
      actorId: admin.id,
      action: "UPDATE_MEDIA",
      entityType: "MediaAsset",
      entityId: id,
      before,
      after: media,
    });
    return apiSuccess(media);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal memperbarui media", "MEDIA_UPDATE_ERROR", 500, error);
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await context.params;
    const before = await db.mediaAsset.findUnique({ where: { id } });
    if (!before) {
      return apiError("Media tidak ditemukan", "MEDIA_NOT_FOUND", 404);
    }
    const playlistUsage = await db.playlistItem.count({ where: { contentId: id } });
    if (playlistUsage) {
      return apiError(
        `Media tidak dapat dihapus karena masih digunakan oleh ${playlistUsage} item playlist.`,
        "MEDIA_IN_USE",
        409,
      );
    }
    await db.mediaAsset.delete({ where: { id } });
    await logActivity({
      actorId: admin.id,
      action: "DELETE_MEDIA",
      entityType: "MediaAsset",
      entityId: id,
      before,
    });
    return apiSuccess({ id });
  } catch (error) {
    return apiError("Gagal menghapus media", "MEDIA_DELETE_ERROR", 500, error);
  }
}
