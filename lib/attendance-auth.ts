import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { hashToken } from "@/lib/auth";
import { readSecret } from "@/lib/secret-config";

/**
 * Perbandingan token memakai timingSafeEqual atas hash SHA-256 keduanya,
 * supaya lama waktu pemeriksaan tidak membocorkan berapa karakter yang cocok.
 */
function tokenMatches(actual: string | null, expected: string) {
  if (!actual) return false;
  const actualHash = Buffer.from(hashToken(actual), "utf8");
  const expectedHash = Buffer.from(hashToken(expected), "utf8");
  if (actualHash.length !== expectedHash.length) return false;
  return timingSafeEqual(actualHash, expectedHash);
}

/**
 * Tanpa ATTENDANCE_DEVICE_TOKEN, endpoint presensi hanya terbuka saat
 * pengembangan lokal (NODE_ENV === "development"). Deployment apa pun di luar
 * itu — production, staging, preview, container dengan NODE_ENV kustom —
 * ditolak, jadi lupa mengisi env var tidak lagi membuat endpoint terbuka.
 */
export function isAuthorizedAttendanceDevice(req: NextRequest) {
  const expected = readSecret("ATTENDANCE_DEVICE_TOKEN");

  if (!expected) {
    return process.env.NODE_ENV === "development";
  }

  const authorization = req.headers.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;
  const deviceToken = req.headers.get("x-attendance-token");

  return tokenMatches(bearerToken || deviceToken, expected);
}
