import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { z } from "zod";

const branchSchema = z.object({
  name: z.string().min(2, "Nama cabang minimal 2 karakter"),
  code: z.string().min(2, "Kode cabang minimal 2 karakter"),
  address: z.string().optional(),
  timezone: z.string().default("Asia/Jakarta"),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    const branches = await db.branch.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { rooms: true, schedules: true, screens: true },
        },
      },
    });
    return apiSuccess(branches);
  } catch (error) {
    return apiError("Gagal mengambil data cabang", "BRANCH_FETCH_ERROR", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = branchSchema.parse(body);

    const existing = await db.branch.findUnique({
      where: { code: validated.code },
    });

    if (existing) {
      return apiError("Kode cabang sudah digunakan", "BRANCH_CODE_EXISTS", 400);
    }

    const branch = await db.branch.create({
      data: validated,
    });

    return apiSuccess(branch, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal menambah cabang", "BRANCH_CREATE_ERROR", 500, error);
  }
}
