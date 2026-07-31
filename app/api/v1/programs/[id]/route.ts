import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { db } from "@/lib/db";

const programUpdateSchema = z.object({
  name: z.string().min(2, "Nama program wajib diisi"),
  level: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Format warna tidak valid"),
  isActive: z.boolean(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const validated = programUpdateSchema.parse(await req.json());
    if (!(await db.program.findUnique({ where: { id } }))) {
      return apiError("Program tidak ditemukan", "PROGRAM_NOT_FOUND", 404);
    }

    const program = await db.program.update({
      where: { id },
      data: validated,
      include: {
        classes: true,
        _count: { select: { classes: true, schedules: true } },
      },
    });
    return apiSuccess(program);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal memperbarui program", "PROGRAM_UPDATE_ERROR", 500, error);
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const program = await db.program.findUnique({
      where: { id },
      include: { _count: { select: { classes: true, schedules: true } } },
    });
    if (!program) return apiError("Program tidak ditemukan", "PROGRAM_NOT_FOUND", 404);

    const dependencies = [
      program._count.classes ? `${program._count.classes} kelas` : null,
      program._count.schedules ? `${program._count.schedules} jadwal` : null,
    ].filter(Boolean);
    if (dependencies.length) {
      return apiError(
        `Program tidak dapat dihapus karena masih digunakan oleh ${dependencies.join(", ")}. Nonaktifkan program atau pindahkan data terkait terlebih dahulu.`,
        "PROGRAM_IN_USE",
        409,
      );
    }

    await db.program.delete({ where: { id } });
    return apiSuccess({ id });
  } catch (error) {
    return apiError("Gagal menghapus program", "PROGRAM_DELETE_ERROR", 500, error);
  }
}
