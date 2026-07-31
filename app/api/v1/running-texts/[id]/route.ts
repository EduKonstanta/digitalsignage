import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { db } from "@/lib/db";

const updateSchema = z.object({
  text: z.string().min(3),
  speed: z.number().int().min(5).max(120),
  separator: z.string().min(1).max(10),
  priority: z.number().int().min(1).max(3),
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
    if (!(await db.runningText.findUnique({ where: { id } }))) {
      return apiError("Running text tidak ditemukan", "RUNNING_TEXT_NOT_FOUND", 404);
    }
    const startsAt = new Date(validated.startsAt);
    const endsAt = new Date(validated.endsAt);
    if (endsAt <= startsAt) {
      return apiError("Waktu selesai harus setelah waktu mulai", "INVALID_TIME_RANGE", 400);
    }
    const ticker = await db.runningText.update({
      where: { id },
      data: { ...validated, startsAt, endsAt },
    });
    return apiSuccess(ticker);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal memperbarui running text", "RUNNING_TEXT_UPDATE_ERROR", 500, error);
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!(await db.runningText.findUnique({ where: { id } }))) {
      return apiError("Running text tidak ditemukan", "RUNNING_TEXT_NOT_FOUND", 404);
    }
    await db.runningText.delete({ where: { id } });
    return apiSuccess({ id });
  } catch (error) {
    return apiError("Gagal menghapus running text", "RUNNING_TEXT_DELETE_ERROR", 500, error);
  }
}
