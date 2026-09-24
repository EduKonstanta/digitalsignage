import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/auth";
import { SCREEN_TOKEN_HEADER } from "@/lib/constants";

export { SCREEN_TOKEN_HEADER };

/** Bandingkan dua hash secara timing-safe. */
function hashEquals(a: string, b: string) {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/**
 * Ambil token layar dari header (atau query, untuk EventSource yang tidak bisa
 * mengirim header kustom) lalu cocokkan dengan Screen.deviceTokenHash.
 *
 * Token ini dihasilkan saat pairing dan sebelumnya tidak pernah diperiksa route
 * mana pun, sehingga perangkat yang belum pernah dipasangkan pun bisa membaca
 * endpoint presensi. Endpoint yang memuat data siswa kini mewajibkannya.
 */
/**
 * Jarak minimum antar-penulisan `lastSeenAt`. Layar melakukan polling presensi
 * tiap 2 detik, jadi menulis di setiap request berarti ~43.000 transaksi tulis
 * per hari per layar — kuota tulis Turso terbakar tanpa menambah informasi.
 * Dengan ambang ini status online tetap akurat dalam rentang satu menit.
 */
const LAST_SEEN_THROTTLE_MS = 60 * 1000;

export async function getScreenFromRequest(req: NextRequest) {
  const headerToken = req.headers.get(SCREEN_TOKEN_HEADER);
  const queryToken = new URL(req.url).searchParams.get("screenToken");
  const token = (headerToken || queryToken || "").trim();
  if (!token) return null;

  const tokenHash = hashToken(token);
  const candidates = await db.screen.findMany({
    where: { revokedAt: null, deviceTokenHash: { not: null } },
    select: { id: true, name: true, deviceTokenHash: true, lastSeenAt: true, status: true },
  });

  const screen = candidates.find(
    (candidate) => candidate.deviceTokenHash && hashEquals(candidate.deviceTokenHash, tokenHash),
  );
  if (!screen) return null;

  const now = Date.now();
  const staleHeartbeat =
    !screen.lastSeenAt || now - screen.lastSeenAt.getTime() >= LAST_SEEN_THROTTLE_MS;

  if (staleHeartbeat || screen.status !== "ONLINE") {
    await db.screen
      .update({
        where: { id: screen.id },
        data: { lastSeenAt: new Date(now), status: "ONLINE" },
      })
      .catch(() => undefined);
  }

  return { id: screen.id, name: screen.name };
}
