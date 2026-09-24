import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { updateProgram, deleteProgram, AcademicDependencyError } from "@/lib/academic-store";
import { z } from "zod";

const updateProgramSchema = z.object({
  name: z.string().min(1, "Nama program wajib diisi").optional(),
  code: z.string().optional(),
  level: z.string().optional().nullable(),
  // Nilai ini dipakai langsung sebagai warna CSS badge program, jadi formatnya
  // divalidasi di sini (sama seperti sebelum refactor) agar tidak rusak diam-diam.
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Warna harus format hex, contoh #3B82F6")
    .optional(),
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
    const validated = updateProgramSchema.parse(body);

    const updated = await updateProgram(
      id,
      {
        ...(validated.name ? { name: validated.name.trim() } : {}),
        ...(validated.code ? { code: validated.code.trim().toUpperCase() } : {}),
        ...(validated.level !== undefined ? { level: validated.level?.trim() || null } : {}),
        ...(validated.color ? { color: validated.color } : {}),
        ...(validated.isActive !== undefined ? { isActive: validated.isActive } : {}),
      },
      admin.id,
    );

    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal memperbarui program", "PROGRAM_UPDATE_ERROR", 500, error);
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
    await deleteProgram(id, admin.id);

    return apiSuccess({ id });
  } catch (error) {
    if (error instanceof AcademicDependencyError) {
      return apiError(error.message, "ENTITY_IN_USE", 409);
    }
    return apiError("Gagal menghapus program", "PROGRAM_DELETE_ERROR", 500, error);
  }
}
