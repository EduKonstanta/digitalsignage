import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { getLiveAcademicData } from "@/lib/google-sheets/live-data";
import { createSubject } from "@/lib/academic-store";
import { z } from "zod";

const subjectSchema = z.object({
  name: z.string().min(1, "Nama mata pelajaran wajib diisi"),
  code: z.string().optional(),
  shortName: z.string().min(1, "Singkatan wajib diisi"),
  icon: z.string().default("book-open"),
  aliases: z.union([z.string(), z.array(z.string())]).optional(),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const live = await getLiveAcademicData();

    const subjects = live.subjects
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "id-ID"))
      .map((subject) => ({
        ...subject,
        _count: {
          schedules: live.schedules.filter((schedule) => schedule.subjectId === subject.id).length,
        },
      }));

    return apiSuccess(subjects);
  } catch (error) {
    return apiError("Gagal mengambil mata pelajaran", "SUBJECT_FETCH_ERROR", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const body = await req.json();
    const validated = subjectSchema.parse(body);

    const subject = await createSubject(
      {
        name: validated.name.trim(),
        code: validated.code?.trim().toUpperCase(),
        shortName: validated.shortName.trim(),
        icon: validated.icon,
        aliases: validated.aliases,
        isActive: validated.isActive,
      },
      admin.id,
    );

    return apiSuccess(subject, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal menambah mata pelajaran", "SUBJECT_CREATE_ERROR", 500, error);
  }
}
