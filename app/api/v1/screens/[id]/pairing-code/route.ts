import crypto from "node:crypto";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin, hashToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";
import { PAIRING_CODE_EXPIRY_MINUTES } from "@/lib/constants";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await context.params;
    const screen = await db.screen.findFirst({ where: { id, revokedAt: null } });
    if (!screen) return apiError("Layar tidak ditemukan", "SCREEN_NOT_FOUND", 404);

    const pairingCode = String(crypto.randomInt(100000, 999999));
    const pairingExpiresAt = new Date(
      Date.now() + PAIRING_CODE_EXPIRY_MINUTES * 60 * 1000,
    );

    await db.screen.update({
      where: { id },
      data: {
        status: "UNPAIRED",
        deviceTokenHash: null,
        pairingCodeHash: hashToken(pairingCode),
        pairingExpiresAt,
        lastSeenAt: null,
      },
    });

    await logActivity({
      actorId: admin.id,
      action: "REGENERATE_SCREEN_PAIRING_CODE",
      entityType: "Screen",
      entityId: id,
      before: screen,
      after: { pairingExpiresAt },
    });

    return apiSuccess({
      id: screen.id,
      name: screen.name,
      pairingCode,
      pairingExpiresAt,
    });
  } catch (error) {
    return apiError("Gagal membuat kode pairing", "PAIRING_CODE_ERROR", 500, error);
  }
}
