import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { updateTutor, deleteTutor, AcademicDependencyError } from "@/lib/academic-store";
import { z } from "zod";

const updateTutorSchema = z.object({
  name: z.string().min(1, "Nama tutor wajib diisi").optional(),
  code: z.string().optional(),
  displayName: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
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
    const validated = updateTutorSchema.parse(body);

    const updated = await updateTutor(
      id,
      {
        ...(validated.name ? { name: validated.name.trim() } : {}),
        ...(validated.code ? { code: validated.code.trim().toUpperCase() } : {}),
        ...(validated.displayName !== undefined ? { displayName: validated.displayName?.trim() || null } : {}),
        ...(validated.title !== undefined ? { title: validated.title?.trim() || null } : {}),
        ...(validated.photoUrl !== undefined ? { photoUrl: validated.photoUrl?.trim() || null } : {}),
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
    return apiError("Gagal memperbarui tutor", "TUTOR_UPDATE_ERROR", 500, error);
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
    await deleteTutor(id, admin.id);

    return apiSuccess({ id });
  } catch (error) {
    if (error instanceof AcademicDependencyError) {
      return apiError(error.message, "ENTITY_IN_USE", 409);
    }
    return apiError("Gagal menghapus tutor", "TUTOR_DELETE_ERROR", 500, error);
  }
}
