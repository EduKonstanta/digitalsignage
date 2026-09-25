import { describe, expect, it } from "vitest";
import { effectiveScreenStatus, SCREEN_OFFLINE_AFTER_MS } from "@/lib/screen-heartbeat";

describe("effectiveScreenStatus", () => {
  const now = Date.parse("2026-09-25T10:00:00Z");

  it("tetap ONLINE bila TV baru saja membuka /display", () => {
    const lastSeenAt = new Date(now - 30_000);
    expect(effectiveScreenStatus({ status: "ONLINE", lastSeenAt }, now)).toBe("ONLINE");
  });

  it("menjadi OFFLINE bila TV lama tidak terlihat walau kolomnya masih ONLINE", () => {
    const lastSeenAt = new Date(now - SCREEN_OFFLINE_AFTER_MS - 1);
    expect(effectiveScreenStatus({ status: "ONLINE", lastSeenAt }, now)).toBe("OFFLINE");
  });

  it("menjadi OFFLINE bila TV belum pernah terlihat", () => {
    expect(effectiveScreenStatus({ status: "ONLINE", lastSeenAt: null }, now)).toBe("OFFLINE");
  });

  it("tidak mengubah status selain ONLINE", () => {
    expect(effectiveScreenStatus({ status: "UNPAIRED", lastSeenAt: null }, now)).toBe("UNPAIRED");
    expect(effectiveScreenStatus({ status: "OFFLINE", lastSeenAt: new Date(now) }, now)).toBe("OFFLINE");
  });
});
