import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { updateBranch, deleteBranch, AcademicDependencyError } from "@/lib/academic-store";
import { getLiveAcademicData } from "@/lib/google-sheets/live-data";
import { z } from "zod";

const updateBranchSchema = z.object({
  name: z.string().min(2, "Nama cabang minimal 2 karakter").optional(),
  code: z.string().min(2, "Kode cabang minimal 2 karakter").optional(),
  address: z.string().optional().nullable(),
  timezone: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await context.params;
    const body = await req.json();
    const validated = updateBranchSchema.parse(body);

    if (validated.code) {
      const live = await getLiveAcademicData();
      const duplicate = live.branches.find(
        (b) => b.id !== id && b.code.toUpperCase() === validated.code!.trim().toUpperCase(),
      );
      if (duplicate) {
        return apiError("Kode cabang sudah digunakan", "BRANCH_CODE_EXISTS", 400);
      }
    }

    const updated = await updateBranch(
      id,
      {
        ...(validated.name ? { name: validated.name.trim() } : {}),
        ...(validated.code ? { code: validated.code.trim().toUpperCase() } : {}),
        ...(validated.address !== undefined ? { address: validated.address?.trim() || null } : {}),
        ...(validated.timezone ? { timezone: validated.timezone } : {}),
        ...(validated.isActive !== undefined ? { isActive: validated.isActive } : {}),
      },
      admin.id,
    );

    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal memperbarui cabang", "BRANCH_UPDATE_ERROR", 500, error);
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await context.params;
    await deleteBranch(id, admin.id);

    return apiSuccess({ id });
  } catch (error) {
    if (error instanceof AcademicDependencyError) {
      return apiError(error.message, "ENTITY_IN_USE", 409);
    }
    return apiError("Gagal menghapus cabang", "BRANCH_DELETE_ERROR", 500, error);
  }
}
