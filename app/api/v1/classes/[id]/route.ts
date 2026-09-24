import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { updateClass, deleteClass, AcademicDependencyError } from "@/lib/academic-store";
import { z } from "zod";

const updateClassSchema = z.object({
  programId: z.string().optional(),
  name: z.string().min(1, "Nama kelas wajib diisi").optional(),
  code: z.string().optional(),
  academicYear: z.string().optional(),
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
    const validated = updateClassSchema.parse(body);

    const updated = await updateClass(
      id,
      {
        ...(validated.programId ? { programId: validated.programId } : {}),
        ...(validated.name ? { name: validated.name.trim() } : {}),
        ...(validated.code ? { code: validated.code.trim().toUpperCase() } : {}),
        ...(validated.academicYear ? { academicYear: validated.academicYear.trim() } : {}),
        ...(validated.isActive !== undefined ? { isActive: validated.isActive } : {}),
      },
      admin.id,
    );

    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal memperbarui kelas", "CLASS_UPDATE_ERROR", 500, error);
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
    await deleteClass(id, admin.id);

    return apiSuccess({ id });
  } catch (error) {
    if (error instanceof AcademicDependencyError) {
      return apiError(error.message, "ENTITY_IN_USE", 409);
    }
    return apiError("Gagal menghapus kelas", "CLASS_DELETE_ERROR", 500, error);
  }
}
