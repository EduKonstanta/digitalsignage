import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { db } from "@/lib/db";

const branchUpdateSchema = z.object({
  name: z.string().min(2, "Nama cabang minimal 2 karakter"),
  code: z.string().min(2, "Kode cabang minimal 2 karakter"),
  address: z.string().optional(),
  timezone: z.string().min(1, "Timezone wajib dipilih"),
  isActive: z.boolean(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const validated = branchUpdateSchema.parse(body);

    const currentBranch = await db.branch.findUnique({ where: { id } });
    if (!currentBranch) {
      return apiError("Cabang tidak ditemukan", "BRANCH_NOT_FOUND", 404);
    }

    const duplicateCode = await db.branch.findFirst({
      where: {
        code: validated.code,
        id: { not: id },
      },
    });
    if (duplicateCode) {
      return apiError("Kode cabang sudah digunakan", "BRANCH_CODE_EXISTS", 409);
    }

    const branch = await db.branch.update({
      where: { id },
      data: validated,
      include: {
        _count: {
          select: { rooms: true, schedules: true, screens: true },
        },
      },
    });

    return apiSuccess(branch);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal memperbarui cabang", "BRANCH_UPDATE_ERROR", 500, error);
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const branch = await db.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: { rooms: true, schedules: true, screens: true },
        },
      },
    });

    if (!branch) {
      return apiError("Cabang tidak ditemukan", "BRANCH_NOT_FOUND", 404);
    }

    const dependencies = [
      branch._count.rooms ? `${branch._count.rooms} ruangan` : null,
      branch._count.schedules ? `${branch._count.schedules} jadwal` : null,
      branch._count.screens ? `${branch._count.screens} layar` : null,
    ].filter(Boolean);

    if (dependencies.length > 0) {
      return apiError(
        `Cabang tidak dapat dihapus karena masih digunakan oleh ${dependencies.join(", ")}. Nonaktifkan cabang atau pindahkan data terkait terlebih dahulu.`,
        "BRANCH_IN_USE",
        409,
      );
    }

    await db.branch.delete({ where: { id } });
    return apiSuccess({ id });
  } catch (error) {
    return apiError("Gagal menghapus cabang", "BRANCH_DELETE_ERROR", 500, error);
  }
}
