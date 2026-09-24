import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { apiError, apiSuccess } from "@/lib/api-response";
import { hashPassword, hashToken, requireAdmin, verifyPassword } from "@/lib/auth";
import { validatePassword } from "@/lib/password-policy";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { logActivity } from "@/lib/activity-log";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const body = (await req.json().catch(() => ({}))) as {
      currentPassword?: string;
      newPassword?: string;
    };

    const currentPassword = body.currentPassword ?? "";
    const newPassword = body.newPassword ?? "";

    if (!currentPassword) {
      return apiError("Password saat ini wajib diisi.", "VALIDATION_ERROR", 400);
    }

    const policyError = validatePassword(newPassword);
    if (policyError) {
      return apiError(policyError, "VALIDATION_ERROR", 400);
    }

    if (currentPassword === newPassword.trim()) {
      return apiError(
        "Password baru harus berbeda dari password saat ini.",
        "VALIDATION_ERROR",
        400,
      );
    }

    const valid = await verifyPassword(currentPassword, admin.passwordHash);
    if (!valid) {
      return apiError("Password saat ini salah.", "INVALID_CURRENT_PASSWORD", 403);
    }

    const passwordHash = await hashPassword(newPassword.trim());

    /**
     * Sesi lain dicabut supaya perangkat yang pernah login dengan password lama
     * tidak ikut terbawa — itu justru alasan orang mengganti password. Sesi yang
     * sedang dipakai sengaja dipertahankan agar admin tidak terlempar keluar
     * tepat setelah berhasil menggantinya.
     */
    const cookieStore = await cookies();
    const currentToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const currentSessionHash = currentToken ? hashToken(currentToken) : null;

    const [, revoked] = await db.$transaction([
      db.admin.update({ where: { id: admin.id }, data: { passwordHash } }),
      db.authSession.updateMany({
        where: {
          adminId: admin.id,
          revokedAt: null,
          ...(currentSessionHash ? { sessionTokenHash: { not: currentSessionHash } } : {}),
        },
        data: { revokedAt: new Date() },
      }),
    ]);

    // Tidak ada password atau hash yang masuk log audit.
    await logActivity({
      actorId: admin.id,
      action: "CHANGE_PASSWORD",
      entityType: "Admin",
      entityId: admin.id,
      after: { revokedSessions: revoked.count },
    });

    return apiSuccess({ revokedSessions: revoked.count });
  } catch (error) {
    return apiError("Gagal mengganti password", "CHANGE_PASSWORD_ERROR", 500, error);
  }
}
