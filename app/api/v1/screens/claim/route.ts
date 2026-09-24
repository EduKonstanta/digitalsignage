import { NextRequest } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

const claimSchema = z.object({
  pairingCode: z.string().min(4, "Kode pairing wajib diisi"),
});

/**
 * Dipanggil perangkat TV itu sendiri (halaman /display), bukan admin. Kode
 * pairing 6 digit ditukar satu kali dengan deviceToken yang kemudian disimpan
 * di perangkat dan dikirim pada setiap permintaan data presensi.
 *
 * Endpoint ini tidak memakai requireAdmin karena TV memang tidak login; kode
 * pairing berumur pendek dan langsung hangus setelah ditukar.
 */
export async function POST(req: NextRequest) {
  try {
    const { pairingCode } = claimSchema.parse(await req.json());
    const pairingCodeHash = hashToken(pairingCode.trim().toUpperCase());

    const screen = await db.screen.findFirst({
      where: { pairingCodeHash, revokedAt: null },
    });

    if (!screen) {
      return apiError(
        "Kode pairing tidak valid atau sudah kedaluwarsa",
        "PAIRING_CODE_INVALID",
        400,
      );
    }

    /**
     * pairingExpiresAt null berarti kode permanen: dipasang sendiri oleh admin,
     * tidak punya tenggat, dan tetap berlaku setelah dipakai supaya layar yang
     * sama bisa dipasang ulang tanpa membuat kode baru. Kode sekali pakai punya
     * tenggat dan dihapus begitu ditukar.
     */
    const isPermanent = screen.pairingExpiresAt === null;

    if (!isPermanent && screen.pairingExpiresAt! < new Date()) {
      return apiError(
        "Kode pairing tidak valid atau sudah kedaluwarsa",
        "PAIRING_CODE_INVALID",
        400,
      );
    }

    const deviceToken = crypto.randomBytes(32).toString("hex");

    await db.screen.update({
      where: { id: screen.id },
      data: {
        status: "ONLINE",
        deviceTokenHash: hashToken(deviceToken),
        ...(isPermanent ? {} : { pairingCodeHash: null, pairingExpiresAt: null }),
        lastSeenAt: new Date(),
      },
    });

    // Tidak dicatat ke ActivityLog: tabel itu mewajibkan actorId milik Admin,
    // sedangkan pemanggil di sini adalah perangkat TV yang tidak login.
    // Jejaknya tetap terlihat lewat perubahan status & lastSeenAt layar.

    // deviceToken hanya dikembalikan sekali ini; server hanya menyimpan hash-nya.
    return apiSuccess({
      deviceToken,
      screen: { id: screen.id, name: screen.name },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal memasangkan perangkat", "SCREEN_CLAIM_ERROR", 500, error);
  }
}
