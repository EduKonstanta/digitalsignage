import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { z } from "zod";

const classSchema = z.object({
  programId: z.string().min(1, "Program ID required"),
  name: z.string().min(2, "Nama kelas required"),
  academicYear: z.string().default("2025/2026"),
  isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const programId = searchParams.get("programId");

    const classes = await db.class.findMany({
      where: programId ? { programId } : undefined,
      include: {
        program: true,
        _count: { select: { schedules: true } },
      },
      orderBy: { name: "asc" },
    });

    return apiSuccess(classes);
  } catch (error) {
    return apiError("Gagal mengambil data kelas", "CLASS_FETCH_ERROR", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = classSchema.parse(body);

    const newClass = await db.class.create({
      data: validated,
    });

    return apiSuccess(newClass, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal membuat kelas", "CLASS_CREATE_ERROR", 500, error);
  }
}
