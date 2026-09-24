import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { getLiveAcademicData } from "@/lib/google-sheets/live-data";
import { createTutor } from "@/lib/academic-store";
import { z } from "zod";

const tutorSchema = z.object({
  name: z.string().min(1, "Nama tutor wajib diisi"),
  code: z.string().optional(),
  displayName: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  aliases: z.union([z.string(), z.array(z.string())]).optional(),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const live = await getLiveAcademicData();

    const tutors = live.tutors
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "id-ID"))
      .map((tutor) => ({
        ...tutor,
        _count: {
          schedules: live.schedules.filter((schedule) => schedule.tutorId === tutor.id).length,
        },
      }));

    return apiSuccess(tutors);
  } catch (error) {
    return apiError("Gagal mengambil data tutor", "TUTOR_FETCH_ERROR", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const body = await req.json();
    const validated = tutorSchema.parse(body);

    const tutor = await createTutor(
      {
        name: validated.name.trim(),
        code: validated.code?.trim().toUpperCase(),
        displayName: validated.displayName?.trim() || null,
        title: validated.title?.trim() || null,
        photoUrl: validated.photoUrl?.trim() || null,
        aliases: validated.aliases,
        isActive: validated.isActive,
      },
      admin.id,
    );

    return apiSuccess(tutor, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal menambah tutor", "TUTOR_CREATE_ERROR", 500, error);
  }
}
