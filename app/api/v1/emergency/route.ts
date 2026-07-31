import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { z } from "zod";

const emergencySchema = z.object({
  title: z.string().min(2, "Judul emergency required"),
  instruction: z.string().min(5, "Instruksi emergency required"),
  severity: z.enum(["INFO", "WARNING", "CRITICAL"]).default("WARNING"),
  voiceEnabled: z.boolean().default(false),
});

export async function GET() {
  try {
    const active = await db.emergencyBroadcast.findFirst({
      where: { endedAt: null, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
    });
    return apiSuccess(active);
  } catch (error) {
    return apiError("Gagal mengambil data emergency", "EMERGENCY_FETCH_ERROR", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = emergencySchema.parse(body);

    const broadcast = await db.emergencyBroadcast.create({
      data: {
        ...validated,
        createdById: "admin",
        status: "PUBLISHED",
      },
    });

    return apiSuccess(broadcast, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal mengirimkan emergency broadcast", "EMERGENCY_POST_ERROR", 500, error);
  }
}
