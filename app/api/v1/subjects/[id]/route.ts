import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { db } from "@/lib/db";

const subjectUpdateSchema = z.object({
  name: z.string().min(2, "Nama mata pelajaran wajib diisi"),
  shortName: z.string().min(1, "Singkatan wajib diisi"),
  icon: z.string().optional(),
  aliases: z.array(z.string()).default([]),
  isActive: z.boolean(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const validated = subjectUpdateSchema.parse(await req.json());
    if (!(await db.subject.findUnique({ where: { id } }))) {
      return apiError("Mata pelajaran tidak ditemukan", "SUBJECT_NOT_FOUND", 404);
    }

    const subject = await db.subject.update({
      where: { id },
      data: { ...validated, aliases: JSON.stringify(validated.aliases) },
      include: { _count: { select: { schedules: true } } },
    });
    return apiSuccess(subject);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal memperbarui mata pelajaran", "SUBJECT_UPDATE_ERROR", 500, error);
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const subject = await db.subject.findUnique({
      where: { id },
      include: { _count: { select: { schedules: true } } },
    });
    if (!subject) {
      return apiError("Mata pelajaran tidak ditemukan", "SUBJECT_NOT_FOUND", 404);
    }
    if (subject._count.schedules) {
      return apiError(
        `Mata pelajaran tidak dapat dihapus karena masih digunakan oleh ${subject._count.schedules} jadwal. Nonaktifkan mata pelajaran terlebih dahulu.`,
        "SUBJECT_IN_USE",
        409,
      );
    }

    await db.subject.delete({ where: { id } });
    return apiSuccess({ id });
  } catch (error) {
    return apiError("Gagal menghapus mata pelajaran", "SUBJECT_DELETE_ERROR", 500, error);
  }
}
