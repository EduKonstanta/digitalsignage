import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const updateSchema = z.object({
  text: z.string().min(3),
  audioUrl: z.string().optional(),
  openingAudioUrl: z.string().optional(),
  voiceName: z.string().min(1),
  language: z.string().min(2),
  volume: z.number().int().min(0).max(100),
  repetitions: z.number().int().min(1).max(10),
  intervalSeconds: z.number().int().min(0).max(3600),
  scheduledAt: z.string().datetime(),
  priority: z.number().int().min(1).max(3),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "EXPIRED", "ARCHIVED"]),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await context.params;
    const validated = updateSchema.parse(await req.json());
    if (!(await db.voiceAnnouncement.findUnique({ where: { id } }))) {
      return apiError("Informasi suara tidak ditemukan", "VOICE_NOT_FOUND", 404);
    }
    const voice = await db.voiceAnnouncement.update({
      where: { id },
      data: { ...validated, scheduledAt: new Date(validated.scheduledAt) },
      include: { _count: { select: { logs: true } } },
    });
    return apiSuccess(voice);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal memperbarui informasi suara", "VOICE_UPDATE_ERROR", 500, error);
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await context.params;
    if (!(await db.voiceAnnouncement.findUnique({ where: { id } }))) {
      return apiError("Informasi suara tidak ditemukan", "VOICE_NOT_FOUND", 404);
    }
    await db.voiceAnnouncement.delete({ where: { id } });
    return apiSuccess({ id });
  } catch (error) {
    return apiError("Gagal menghapus informasi suara", "VOICE_DELETE_ERROR", 500, error);
  }
}
