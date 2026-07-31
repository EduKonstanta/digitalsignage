import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { db } from "@/lib/db";

const tutorUpdateSchema = z.object({
  name: z.string().min(2, "Nama tutor wajib diisi"),
  displayName: z.string().optional(),
  title: z.string().optional(),
  photoUrl: z.string().optional(),
  aliases: z.array(z.string()).default([]),
  isActive: z.boolean(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const validated = tutorUpdateSchema.parse(await req.json());
    if (!(await db.tutor.findUnique({ where: { id } }))) {
      return apiError("Tutor tidak ditemukan", "TUTOR_NOT_FOUND", 404);
    }

    const tutor = await db.tutor.update({
      where: { id },
      data: { ...validated, aliases: JSON.stringify(validated.aliases) },
      include: { _count: { select: { schedules: true } } },
    });
    return apiSuccess(tutor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal memperbarui tutor", "TUTOR_UPDATE_ERROR", 500, error);
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const tutor = await db.tutor.findUnique({
      where: { id },
      include: { _count: { select: { schedules: true } } },
    });
    if (!tutor) return apiError("Tutor tidak ditemukan", "TUTOR_NOT_FOUND", 404);
    if (tutor._count.schedules) {
      return apiError(
        `Tutor tidak dapat dihapus karena masih digunakan oleh ${tutor._count.schedules} jadwal. Nonaktifkan tutor terlebih dahulu.`,
        "TUTOR_IN_USE",
        409,
      );
    }

    await db.tutor.delete({ where: { id } });
    return apiSuccess({ id });
  } catch (error) {
    return apiError("Gagal menghapus tutor", "TUTOR_DELETE_ERROR", 500, error);
  }
}
