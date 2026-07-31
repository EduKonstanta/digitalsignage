import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { z } from "zod";

const subjectSchema = z.object({
  name: z.string().min(2, "Nama mata pelajaran required"),
  shortName: z.string().min(1, "Singkatan required"),
  icon: z.string().optional(),
  aliases: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    const subjects = await db.subject.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { schedules: true } },
      },
    });
    return apiSuccess(subjects);
  } catch (error) {
    return apiError("Gagal mengambil mata pelajaran", "SUBJECT_FETCH_ERROR", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = subjectSchema.parse(body);

    const subject = await db.subject.create({
      data: {
        ...validated,
        aliases: JSON.stringify(validated.aliases),
      },
    });

    return apiSuccess(subject, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal menambah mata pelajaran", "SUBJECT_CREATE_ERROR", 500, error);
  }
}
