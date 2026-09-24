import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { updateRoom, deleteRoom, AcademicDependencyError } from "@/lib/academic-store";
import { z } from "zod";

const updateRoomSchema = z.object({
  branchId: z.string().optional(),
  name: z.string().min(1, "Nama ruangan wajib diisi").optional(),
  code: z.string().optional(),
  floor: z.number().int().min(0).optional(),
  capacity: z.number().int().min(1).optional().nullable(),
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE"]).optional(),
  aliases: z.union([z.string(), z.array(z.string())]).optional(),
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
    const validated = updateRoomSchema.parse(body);

    const updated = await updateRoom(
      id,
      {
        ...(validated.branchId ? { branchId: validated.branchId } : {}),
        ...(validated.name ? { name: validated.name.trim() } : {}),
        ...(validated.code ? { code: validated.code.trim().toUpperCase() } : {}),
        ...(validated.floor !== undefined ? { floor: validated.floor } : {}),
        ...(validated.capacity !== undefined ? { capacity: validated.capacity } : {}),
        ...(validated.status ? { status: validated.status } : {}),
        ...(validated.aliases !== undefined ? { aliases: validated.aliases } : {}),
      },
      admin.id,
    );

    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal memperbarui ruangan", "ROOM_UPDATE_ERROR", 500, error);
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
    await deleteRoom(id, admin.id);

    return apiSuccess({ id });
  } catch (error) {
    if (error instanceof AcademicDependencyError) {
      return apiError(error.message, "ENTITY_IN_USE", 409);
    }
    return apiError("Gagal menghapus ruangan", "ROOM_DELETE_ERROR", 500, error);
  }
}
