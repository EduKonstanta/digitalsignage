import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { z } from "zod";

const programSchema = z.object({
  name: z.string().min(2, "Nama program required"),
  level: z.string().optional(),
  color: z.string().default("#3B82F6"),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    const programs = await db.program.findMany({
      orderBy: { name: "asc" },
      include: {
        classes: true,
        _count: { select: { classes: true, schedules: true } },
      },
    });
    return apiSuccess(programs);
  } catch (error) {
    return apiError("Gagal mengambil data program", "PROGRAM_FETCH_ERROR", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = programSchema.parse(body);

    const program = await db.program.create({
      data: validated,
    });

    return apiSuccess(program, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal menambah program", "PROGRAM_CREATE_ERROR", 500, error);
  }
}
