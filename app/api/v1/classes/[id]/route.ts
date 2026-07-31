import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { db } from "@/lib/db";

const classUpdateSchema = z.object({
  programId: z.string().min(1, "Program wajib dipilih"),
  name: z.string().min(2, "Nama kelas wajib diisi"),
  academicYear: z.string().min(4, "Tahun akademik wajib diisi"),
  isActive: z.boolean(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const validated = classUpdateSchema.parse(await req.json());
    if (!(await db.class.findUnique({ where: { id } }))) {
      return apiError("Kelas tidak ditemukan", "CLASS_NOT_FOUND", 404);
    }

    const academicClass = await db.class.update({
      where: { id },
      data: validated,
      include: {
        program: true,
        _count: { select: { schedules: true } },
      },
    });
    return apiSuccess(academicClass);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal memperbarui kelas", "CLASS_UPDATE_ERROR", 500, error);
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const academicClass = await db.class.findUnique({
      where: { id },
      include: { _count: { select: { schedules: true } } },
    });
    if (!academicClass) return apiError("Kelas tidak ditemukan", "CLASS_NOT_FOUND", 404);
    if (academicClass._count.schedules) {
      return apiError(
        `Kelas tidak dapat dihapus karena masih digunakan oleh ${academicClass._count.schedules} jadwal. Nonaktifkan kelas terlebih dahulu.`,
        "CLASS_IN_USE",
        409,
      );
    }

    await db.class.delete({ where: { id } });
    return apiSuccess({ id });
  } catch (error) {
    return apiError("Gagal menghapus kelas", "CLASS_DELETE_ERROR", 500, error);
  }
}
