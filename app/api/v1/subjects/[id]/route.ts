import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { updateSubject, deleteSubject, AcademicDependencyError } from "@/lib/academic-store";
import { z } from "zod";

const updateSubjectSchema = z.object({
  name: z.string().min(1, "Nama mata pelajaran wajib diisi").optional(),
  code: z.string().optional(),
  shortName: z.string().min(1, "Singkatan wajib diisi").optional(),
  icon: z.string().optional(),
  aliases: z.union([z.string(), z.array(z.string())]).optional(),
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
    const validated = updateSubjectSchema.parse(body);

    const updated = await updateSubject(
      id,
      {
        ...(validated.name ? { name: validated.name.trim() } : {}),
        ...(validated.code ? { code: validated.code.trim().toUpperCase() } : {}),
        ...(validated.shortName ? { shortName: validated.shortName.trim() } : {}),
        ...(validated.icon ? { icon: validated.icon } : {}),
        ...(validated.aliases !== undefined ? { aliases: validated.aliases } : {}),
        ...(validated.isActive !== undefined ? { isActive: validated.isActive } : {}),
      },
      admin.id,
    );

    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal memperbarui mata pelajaran", "SUBJECT_UPDATE_ERROR", 500, error);
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
    await deleteSubject(id, admin.id);

    return apiSuccess({ id });
  } catch (error) {
    if (error instanceof AcademicDependencyError) {
      return apiError(error.message, "ENTITY_IN_USE", 409);
    }
    return apiError("Gagal menghapus mata pelajaran", "SUBJECT_DELETE_ERROR", 500, error);
  }
}
