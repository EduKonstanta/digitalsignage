import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { db } from "@/lib/db";

const voiceSchema = z.object({
  text: z.string().min(3, "Teks suara wajib diisi"),
  audioUrl: z.string().optional(),
  openingAudioUrl: z.string().optional(),
  voiceName: z.string().min(1),
  language: z.string().min(2),
  volume: z.number().int().min(0).max(100),
  repetitions: z.number().int().min(1).max(10),
  intervalSeconds: z.number().int().min(0).max(3600),
  scheduledAt: z.string().datetime(),
  priority: z.number().int().min(1).max(3),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "EXPIRED", "ARCHIVED"]),
});

export async function GET() {
  try {
    const voices = await db.voiceAnnouncement.findMany({
      include: { _count: { select: { logs: true } } },
      orderBy: { scheduledAt: "desc" },
    });
    return apiSuccess(voices);
  } catch (error) {
    return apiError("Gagal mengambil informasi suara", "VOICE_FETCH_ERROR", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const validated = voiceSchema.parse(await req.json());
    const voice = await db.voiceAnnouncement.create({
      data: {
        ...validated,
        scheduledAt: new Date(validated.scheduledAt),
        createdById: "admin",
      },
    });
    return apiSuccess(voice, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal membuat informasi suara", "VOICE_CREATE_ERROR", 500, error);
  }
}
