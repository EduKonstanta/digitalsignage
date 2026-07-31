import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { db } from "@/lib/db";

const mediaSchema = z
  .object({
    name: z.string().min(2, "Nama media wajib diisi"),
    mediaType: z.enum([
      "IMAGE",
      "VIDEO",
      "AUDIO",
      "YOUTUBE",
      "INSTAGRAM",
      "TIKTOK",
      "GOOGLE_DRIVE",
      "GOOGLE_SLIDES",
      "CANVA",
      "WEB_EMBED",
    ]),
    fileUrl: z.string().optional(),
    externalUrl: z.string().optional(),
    thumbnailUrl: z.string().optional(),
    durationSeconds: z.number().int().min(1).max(3600),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    mimeType: z.string().optional(),
    tags: z.array(z.string()).default([]),
    status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "EXPIRED", "ARCHIVED"]),
  })
  .refine((data) => Boolean(data.fileUrl?.trim() || data.externalUrl?.trim()), {
    message: "Isi URL utama/path file, atau URL eksternal/sematan untuk embed",
    path: ["fileUrl"],
  });

export async function GET() {
  try {
    const media = await db.mediaAsset.findMany({ orderBy: { updatedAt: "desc" } });
    return apiSuccess(media);
  } catch (error) {
    return apiError("Gagal mengambil galeri media", "MEDIA_FETCH_ERROR", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const validated = mediaSchema.parse(await req.json());
    const media = await db.mediaAsset.create({
      data: { ...validated, tags: JSON.stringify(validated.tags) },
    });
    return apiSuccess(media, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal menambahkan media", "MEDIA_CREATE_ERROR", 500, error);
  }
}
