import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { getLiveAcademicData } from "@/lib/google-sheets/live-data";
import { createClass } from "@/lib/academic-store";
import { z } from "zod";

const classSchema = z.object({
  programId: z.string().min(1, "Program wajib dipilih"),
  name: z.string().min(1, "Nama kelas wajib diisi"),
  code: z.string().optional(),
  academicYear: z.string().default("2026/2027"),
  isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { searchParams } = new URL(req.url);
    const programId = searchParams.get("programId");

    const live = await getLiveAcademicData();

    const classes = live.classes
      .filter((klass) => !programId || klass.programId === programId)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "id-ID"))
      .map((klass) => ({
        ...klass,
        _count: {
          schedules: live.schedules.filter((schedule) => schedule.classId === klass.id).length,
        },
      }));

    return apiSuccess(classes);
  } catch (error) {
    return apiError("Gagal mengambil data kelas", "CLASS_FETCH_ERROR", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const body = await req.json();
    const validated = classSchema.parse(body);

    const klass = await createClass(
      {
        programId: validated.programId,
        name: validated.name.trim(),
        code: validated.code?.trim().toUpperCase(),
        academicYear: validated.academicYear.trim(),
        isActive: validated.isActive,
      },
      admin.id,
    );

    return apiSuccess(klass, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal menambah kelas", "CLASS_CREATE_ERROR", 500, error);
  }
}
