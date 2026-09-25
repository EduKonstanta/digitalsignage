import { db } from "@/lib/db";

/**
 * Jarak minimum antar-penulisan `lastSeenAt`. Layar memuat ulang /display tiap
 * 30 detik, jadi menulis di setiap request berarti ribuan transaksi tulis per
 * hari per layar — kuota tulis Turso terbakar tanpa menambah informasi. Dengan
 * ambang ini status online tetap akurat dalam rentang satu menit.
 */
const LAST_SEEN_THROTTLE_MS = 60 * 1000;

/**
 * Batas layar dianggap mati. Kolom `status` hanya pernah ditulis ONLINE (saat
 * TV membuka /display) dan tidak ada yang menurunkannya lagi, jadi TV yang
 * dimatikan tetap tercatat ONLINE selamanya. Status sebenarnya diturunkan dari
 * `lastSeenAt`: display me-refresh tiap 30 detik dan penulisan dibatasi tiap
 * 60 detik, sehingga 3 menit memberi ruang untuk dua kali refresh yang gagal.
 */
export const SCREEN_OFFLINE_AFTER_MS = 3 * 60 * 1000;

export function effectiveScreenStatus(
  screen: { status: string; lastSeenAt: Date | null },
  now = Date.now(),
): string {
  if (screen.status !== "ONLINE") return screen.status;
  if (!screen.lastSeenAt || now - screen.lastSeenAt.getTime() > SCREEN_OFFLINE_AFTER_MS) {
    return "OFFLINE";
  }
  return "ONLINE";
}

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
