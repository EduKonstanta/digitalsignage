import { db } from "@/lib/db";

/**
 * Jarak minimum antar-penulisan `lastSeenAt`. Layar memuat ulang /display tiap
 * 30 detik, jadi menulis di setiap request berarti ribuan transaksi tulis per
 * hari per layar — kuota tulis Turso terbakar tanpa menambah informasi. Dengan
 * ambang ini status online tetap akurat dalam rentang satu menit.
 */
const LAST_SEEN_THROTTLE_MS = 60 * 1000;

/** Catat bahwa layar terdaftar ini baru saja membuka /display. */
export async function markScreenSeen(screen: {
  id: string;
  status: string;
  lastSeenAt: Date | null;
}) {
  const now = Date.now();
  const stale = !screen.lastSeenAt || now - screen.lastSeenAt.getTime() >= LAST_SEEN_THROTTLE_MS;
  if (!stale && screen.status === "ONLINE") return;

  await db.screen
    .update({
      where: { id: screen.id },
      data: { lastSeenAt: new Date(now), status: "ONLINE" },
    })
    .catch(() => undefined);
}
