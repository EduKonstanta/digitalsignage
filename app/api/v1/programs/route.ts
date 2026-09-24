import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { getLiveAcademicData } from "@/lib/google-sheets/live-data";
import { createProgram } from "@/lib/academic-store";
import { z } from "zod";

const programSchema = z.object({
  name: z.string().min(1, "Nama program wajib diisi"),
  code: z.string().optional(),
  level: z.string().optional().nullable(),
  color: z.string().default("#3B82F6"),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const live = await getLiveAcademicData();

    const programs = live.programs
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "id-ID"))
      .map((program) => ({
        ...program,
        classes: live.classes.filter((klass) => klass.programId === program.id),
        _count: {
          classes: live.classes.filter((klass) => klass.programId === program.id).length,
          schedules: live.schedules.filter((schedule) => schedule.programId === program.id).length,
        },
      }));

    return apiSuccess(programs);
  } catch (error) {
    return apiError("Gagal mengambil data program", "PROGRAM_FETCH_ERROR", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const body = await req.json();
    const validated = programSchema.parse(body);

    const program = await createProgram(
      {
        name: validated.name.trim(),
        code: validated.code?.trim().toUpperCase(),
        level: validated.level?.trim() || null,
        color: validated.color,
        isActive: validated.isActive,
      },
      admin.id,
    );

    return apiSuccess(program, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal menambah program", "PROGRAM_CREATE_ERROR", 500, error);
  }
}
