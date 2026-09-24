import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLiveAcademicData } from "@/lib/google-sheets/live-data";
import { createBranch } from "@/lib/academic-store";
import { z } from "zod";

const branchSchema = z.object({
  name: z.string().min(2, "Nama cabang minimal 2 karakter"),
  code: z.string().min(2, "Kode cabang minimal 2 karakter"),
  address: z.string().optional().nullable(),
  timezone: z.string().default("Asia/Jakarta"),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const [live, screens] = await Promise.all([
      getLiveAcademicData(),
      db.screen.findMany({ select: { branchId: true } }),
    ]);

    const branches = live.branches
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "id-ID"))
      .map((branch) => ({
        ...branch,
        _count: {
          rooms: live.rooms.filter((room) => room.branchId === branch.id).length,
          schedules: live.schedules.filter((schedule) => schedule.branchId === branch.id).length,
          screens: screens.filter((screen) => screen.branchId === branch.id).length,
        },
      }));

    return apiSuccess(branches);
  } catch (error) {
    return apiError("Gagal mengambil data cabang", "BRANCH_FETCH_ERROR", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const body = await req.json();
    const validated = branchSchema.parse(body);

    const live = await getLiveAcademicData();
    const existing = live.branches.find(
      (b) => b.code.toUpperCase() === validated.code.trim().toUpperCase(),
    );
    if (existing) {
      return apiError("Kode cabang sudah digunakan", "BRANCH_CODE_EXISTS", 400);
    }

    const branch = await createBranch(
      {
        name: validated.name.trim(),
        code: validated.code.trim().toUpperCase(),
        address: validated.address?.trim() || null,
        timezone: validated.timezone,
        isActive: validated.isActive,
      },
      admin.id,
    );

    return apiSuccess(branch, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal menambah cabang", "BRANCH_CREATE_ERROR", 500, error);
  }
}
