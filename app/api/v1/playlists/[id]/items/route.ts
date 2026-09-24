import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getLiveAcademicData } from "@/lib/google-sheets/live-data";

const itemSchema = z.object({
  contentType: z.enum([
    "SCHEDULE_LAYOUT",
    "ANNOUNCEMENT",
    "MEDIA",
    "COUNTDOWN",
    "WELCOME",
    "EXAMINATION",
  ]),
  contentId: z.string().min(1, "Konten wajib dipilih"),
  durationSeconds: z.number().int().min(3).max(3600),
  transition: z.enum(["fade", "slide", "zoom", "none"]).default("fade"),
  isEnabled: z.boolean().default(true),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
});

const itemsSchema = z.object({ items: z.array(itemSchema).max(100) });

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await context.params;
    const { items } = itemsSchema.parse(await req.json());
    if (!(await db.playlist.findUnique({ where: { id } }))) {
      return apiError("Playlist tidak ditemukan", "PLAYLIST_NOT_FOUND", 404);
    }

    const hasScheduleItems = items.some((item) => item.contentType === "SCHEDULE_LAYOUT");
    const live = hasScheduleItems ? await getLiveAcademicData() : null;

    for (const item of items) {
      if (item.startsAt && item.endsAt && new Date(item.endsAt) <= new Date(item.startsAt)) {
        return apiError("Waktu selesai item harus setelah waktu mulai", "INVALID_TIME_RANGE", 400);
      }
      if (item.contentType === "ANNOUNCEMENT") {
        const exists = await db.announcement.findUnique({ where: { id: item.contentId } });
        if (!exists) return apiError("Pengumuman pada playlist tidak ditemukan", "CONTENT_NOT_FOUND", 400);
      }
      if (item.contentType === "MEDIA") {
        const exists = await db.mediaAsset.findUnique({ where: { id: item.contentId } });
        if (!exists) return apiError("Media pada playlist tidak ditemukan", "CONTENT_NOT_FOUND", 400);
      }
      if (item.contentType === "SCHEDULE_LAYOUT") {
        const exists = live?.schedules.some((schedule) => schedule.id === item.contentId);
        if (!exists) return apiError("Jadwal pada playlist tidak ditemukan", "CONTENT_NOT_FOUND", 400);
      }
      // COUNTDOWN, WELCOME, EXAMINATION have no backing table (they're
      // built-in layout templates), so contentId is intentionally unchecked.
    }

    const playlist = await db.$transaction(async (tx) => {
      await tx.playlistItem.deleteMany({ where: { playlistId: id } });
      if (items.length) {
        await tx.playlistItem.createMany({
          data: items.map((item, index) => ({
            playlistId: id,
            contentType: item.contentType,
            contentId: item.contentId,
            sequence: index + 1,
            durationSeconds: item.durationSeconds,
            transition: item.transition,
            isEnabled: item.isEnabled,
            startsAt: item.startsAt ? new Date(item.startsAt) : null,
            endsAt: item.endsAt ? new Date(item.endsAt) : null,
          })),
        });
      }
      return tx.playlist.update({
        where: { id },
        data: { version: { increment: 1 } },
        include: {
          items: { orderBy: { sequence: "asc" } },
          _count: { select: { items: true, screens: true } },
        },
      });
    });

    return apiSuccess(playlist);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal menyimpan item playlist", "PLAYLIST_ITEMS_UPDATE_ERROR", 500, error);
  }
}
