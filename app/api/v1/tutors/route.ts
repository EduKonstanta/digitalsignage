import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { z } from "zod";

const tutorSchema = z.object({
  name: z.string().min(2, "Nama tutor required"),
  displayName: z.string().optional(),
  title: z.string().optional(),
  photoUrl: z.string().optional(),
  aliases: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    const tutors = await db.tutor.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { schedules: true } },
      },
    });

    return apiSuccess(tutors);
  } catch (error) {
    return apiError("Gagal mengambil data tutor", "TUTOR_FETCH_ERROR", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = tutorSchema.parse(body);

    const tutor = await db.tutor.create({
      data: {
        ...validated,
        aliases: JSON.stringify(validated.aliases),
      },
    });

    return apiSuccess(tutor, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal menambah tutor", "TUTOR_CREATE_ERROR", 500, error);
  }
}
