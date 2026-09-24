import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { hashToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { readSecret } from "@/lib/secret-config";

export const dynamic = "force-dynamic";

/** Status yang boleh ditulis ke kolom fonnteStatus; selain ini diabaikan. */
const ALLOWED_FONNTE_STATUSES = new Set([
  "QUEUED",
  "SENT",
  "DELIVERED",
  "READ",
  "FAILED",
  "DISABLED",
  "SKIPPED",
  "PENDING",
]);

/** Bandingkan hash secret secara timing-safe supaya tidak bisa ditebak lewat selisih waktu. */
function secretMatches(supplied: string | null, expected: string) {
  if (!supplied) return false;
  const suppliedHash = Buffer.from(hashToken(supplied), "utf8");
  const expectedHash = Buffer.from(hashToken(expected), "utf8");
  if (suppliedHash.length !== expectedHash.length) return false;
  return timingSafeEqual(suppliedHash, expectedHash);
}

export async function POST(req: NextRequest) {
  try {
    const expectedSecret = readSecret("FONNTE_WEBHOOK_SECRET");
    const suppliedSecret =
      req.headers.get("x-webhook-secret") || new URL(req.url).searchParams.get("secret");

    if (expectedSecret && !secretMatches(suppliedSecret, expectedSecret)) {
      return apiError("Webhook tidak terautentikasi", "UNAUTHORIZED_WEBHOOK", 401);
    }

    if (!expectedSecret && process.env.NODE_ENV === "production") {
      return apiError("Secret webhook belum dikonfigurasi", "WEBHOOK_NOT_CONFIGURED", 503);
    }

    const contentType = req.headers.get("content-type") || "";
    let data: Record<string, unknown>;

    if (contentType.includes("application/json")) {
      data = await req.json().catch(() => ({})) as Record<string, unknown>;
    } else {
      const formData = await req.formData().catch(() => new FormData());
      data = Object.fromEntries(formData.entries());
    }

    const messageId = data.id === undefined || data.id === null ? null : String(data.id);
    const state = typeof data.state === "string" ? data.state : null;
    const status = typeof data.status === "string" ? data.status : null;
    const rawStatus = (state || status || "").trim().toUpperCase();
    const normalizedStatus = ALLOWED_FONNTE_STATUSES.has(rawStatus) ? rawStatus : "";

    if (!messageId) {
      return apiSuccess({ received: true, updated: 0 });
    }

    const result = await db.attendanceLog.updateMany({
      where: { fonnteMessageId: messageId },
      data: {
        ...(normalizedStatus ? { fonnteStatus: normalizedStatus } : {}),
        fonnteState: state,
        fonnteResponse: JSON.stringify(data),
        fonnteUpdatedAt: new Date(),
      },
    });

    return apiSuccess({ received: true, updated: result.count });
  } catch (error) {
    console.error("Fonnte webhook handling error:", error);
    return apiError("Gagal memproses webhook Fonnte", "FONNTE_WEBHOOK_ERROR", 500);
  }
}
