import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { z } from "zod";

const emergencySchema = z.object({
  title: z.string().min(2, "Judul emergency required"),
  instruction: z.string().min(5, "Instruksi emergency required"),
  severity: z.enum(["INFO", "WARNING", "CRITICAL"]).default("WARNING"),
  voiceEnabled: z.boolean().default(false),
});

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

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
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const body = await req.json();
    const validated = emergencySchema.parse(body);

    // Only one active broadcast at a time — end any currently-active one
    // before starting the new takeover.
    await db.emergencyBroadcast.updateMany({
      where: { endedAt: null, status: "PUBLISHED" },
      data: { endedAt: new Date() },
    });

    const broadcast = await db.emergencyBroadcast.create({
      data: {
        ...validated,
        createdById: admin.id,
        status: "PUBLISHED",
      },
    });

    await logActivity({
      actorId: admin.id,
      action: "TRIGGER_EMERGENCY_BROADCAST",
      entityType: "EmergencyBroadcast",
      entityId: broadcast.id,
      after: broadcast,
    });

    return apiSuccess(broadcast, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal mengirimkan emergency broadcast", "EMERGENCY_POST_ERROR", 500, error);
  }
}

export async function PATCH() {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const active = await db.emergencyBroadcast.findFirst({
      where: { endedAt: null, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
    });
    if (!active) {
      return apiError("Tidak ada emergency broadcast yang sedang aktif", "EMERGENCY_NOT_ACTIVE", 404);
    }

    const ended = await db.emergencyBroadcast.update({
      where: { id: active.id },
      data: { endedAt: new Date() },
    });

    await logActivity({
      actorId: admin.id,
      action: "STOP_EMERGENCY_BROADCAST",
      entityType: "EmergencyBroadcast",
      entityId: ended.id,
      before: active,
      after: ended,
    });

    return apiSuccess(ended);
  } catch (error) {
    return apiError("Gagal menghentikan emergency broadcast", "EMERGENCY_STOP_ERROR", 500, error);
  }
}
