import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { hashToken, requireAdmin } from "@/lib/auth";
import { runRetentionCleanup } from "@/lib/retention";
import { readSecret } from "@/lib/secret-config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Bandingkan hash secret secara timing-safe supaya tidak bisa ditebak lewat selisih waktu. */
function secretMatches(supplied: string | null, expected: string) {
  if (!supplied) return false;
  const suppliedHash = Buffer.from(hashToken(supplied), "utf8");
  const expectedHash = Buffer.from(hashToken(expected), "utf8");
  if (suppliedHash.length !== expectedHash.length) return false;
  return timingSafeEqual(suppliedHash, expectedHash);
}

/**
 * Pembersihan data lama sesuai lib/retention.ts.
 *
 * Dipanggil oleh Vercel Cron (mengirim `Authorization: Bearer $CRON_SECRET`),
 * atau manual oleh admin yang sedang login. Endpoint ini menghapus data, jadi
 * tanpa CRON_SECRET di production permintaan ditolak alih-alih dibiarkan
 * terbuka — pola yang sama dengan webhook Fonnte.
 */
async function handle(req: NextRequest) {
  const expectedSecret = readSecret("CRON_SECRET");
  const authorization = req.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;

  const isCron = Boolean(expectedSecret) && secretMatches(bearer, expectedSecret!);

  if (!isCron) {
    const admin = await requireAdmin();
    if (!admin) {
      if (!expectedSecret && process.env.NODE_ENV === "production") {
        return apiError("CRON_SECRET belum dikonfigurasi", "CRON_NOT_CONFIGURED", 503);
      }
      return apiError("Unauthorized", "UNAUTHORIZED", 401);
    }
  }

  try {
    const result = await runRetentionCleanup();
    return apiSuccess(result);
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Gagal menjalankan pembersihan data",
      "RETENTION_CLEANUP_ERROR",
      500,
    );
  }
}

/** Vercel Cron memanggil dengan GET. */
export async function GET(req: NextRequest) {
  return handle(req);
}

/** POST untuk pemicuan manual dari panel admin. */
export async function POST(req: NextRequest) {
  return handle(req);
}
