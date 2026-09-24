import crypto from "node:crypto";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin, hashToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";
import { PAIRING_CODE_EXPIRY_MINUTES } from "@/lib/constants";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Kode boleh ditentukan sendiri oleh admin supaya mudah diingat dan tidak perlu
 * dibuat ulang tiap kali layar dipasang ulang. Enam digit dipertahankan agar
 * cocok dengan kolom masukan di halaman /display.
 */
const bodySchema = z
  .object({
    pairingCode: z
      .string()
      .regex(/^\d{6}$/, "Kode pairing harus tepat 6 angka")
      .optional(),
    permanent: z.boolean().optional(),
  })
  .optional();

export async function POST(req: Request, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await context.params;
    const screen = await db.screen.findFirst({ where: { id, revokedAt: null } });
    if (!screen) return apiError("Layar tidak ditemukan", "SCREEN_NOT_FOUND", 404);

    const parsed = bodySchema.safeParse(await req.json().catch(() => undefined));
    if (!parsed.success) {
      return apiError(
        parsed.error.issues[0]?.message ?? "Validasi gagal",
        "VALIDATION_ERROR",
        400,
      );
    }

    const pairingCode = parsed.data?.pairingCode ?? String(crypto.randomInt(100000, 999999));
    const permanent = parsed.data?.permanent === true;

    /**
     * pairingExpiresAt null berarti kode berlaku selamanya dan tidak hangus
     * setelah dipakai, sehingga layar yang sama bisa dipasang ulang berkali-kali
     * dengan kode yang sama. Kode sekali pakai tetap punya tenggat.
     */
    const pairingExpiresAt = permanent
      ? null
      : new Date(Date.now() + PAIRING_CODE_EXPIRY_MINUTES * 60 * 1000);

    if (!permanent) {
      const duplicate = await db.screen.findFirst({
        where: { pairingCodeHash: hashToken(pairingCode), revokedAt: null, id: { not: id } },
        select: { name: true },
      });
      if (duplicate) {
        return apiError(
          `Kode ${pairingCode} sedang dipakai layar lain (${duplicate.name}).`,
          "PAIRING_CODE_TAKEN",
          409,
        );
      }
    }

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
      // Kode itu sendiri tidak ikut dicatat.
      after: { pairingExpiresAt, permanent },
    });

    return apiSuccess({
      id: screen.id,
      name: screen.name,
      pairingCode,
      pairingExpiresAt,
      permanent,
    });
  } catch (error) {
    return apiError("Gagal membuat kode pairing", "PAIRING_CODE_ERROR", 500, error);
  }
}
