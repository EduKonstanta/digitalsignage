import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { db } from "@/lib/db";

const updateSchema = z.object({
  title: z.string().min(3),
  summary: z.string().optional(),
  body: z.string().min(3),
  category: z.string().min(1),
  priority: z.number().int().min(1).max(3),
  icon: z.string().optional(),
  imageUrl: z.string().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "EXPIRED", "ARCHIVED"]),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const validated = updateSchema.parse(await req.json());
    const current = await db.announcement.findUnique({ where: { id } });
    if (!current) return apiError("Pengumuman tidak ditemukan", "ANNOUNCEMENT_NOT_FOUND", 404);

    const startsAt = new Date(validated.startsAt);
    const endsAt = new Date(validated.endsAt);
    if (endsAt <= startsAt) {
      return apiError("Waktu selesai harus setelah waktu mulai", "INVALID_TIME_RANGE", 400);
    }

    const announcement = await db.announcement.update({
      where: { id },
      data: {
        ...validated,
        startsAt,
        endsAt,
        publishedAt:
          validated.status === "PUBLISHED" ? current.publishedAt ?? new Date() : null,
      },
    });
    return apiSuccess(announcement);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal memperbarui pengumuman", "ANNOUNCEMENT_UPDATE_ERROR", 500, error);
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!(await db.announcement.findUnique({ where: { id } }))) {
      return apiError("Pengumuman tidak ditemukan", "ANNOUNCEMENT_NOT_FOUND", 404);
    }
    await db.announcement.delete({ where: { id } });
    return apiSuccess({ id });
  } catch (error) {
    return apiError("Gagal menghapus pengumuman", "ANNOUNCEMENT_DELETE_ERROR", 500, error);
  }
}
