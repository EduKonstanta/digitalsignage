import { afterEach, describe, expect, it, vi } from "vitest";
import { readSecret } from "@/lib/secret-config";

const NAME = "TEST_SECRET_FOR_UNIT";

afterEach(() => {
  delete process.env[NAME];
  vi.restoreAllMocks();
});

describe("readSecret", () => {
  it("mengembalikan nilai sungguhan apa adanya", () => {
    process.env[NAME] = "a1b2c3d4e5f6";
    expect(readSecret(NAME)).toBe("a1b2c3d4e5f6");
  });

  it("memangkas spasi di ujung", () => {
    process.env[NAME] = "  a1b2c3  ";
    expect(readSecret(NAME)).toBe("a1b2c3");
  });

  it("mengembalikan null bila belum diatur atau kosong", () => {
    expect(readSecret(NAME)).toBeNull();
    process.env[NAME] = "   ";
    expect(readSecret(NAME)).toBeNull();
  });

  /**
   * Inti dari modul ini: nilai contoh di .env.example terbuka di repositori,
   * jadi menerimanya sama saja dengan tidak memasang penjagaan sama sekali.
   */
  it("memperlakukan nilai contoh .env.example sebagai belum diatur", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    for (const placeholder of [
      "replace-with-a-random-cron-secret",
      "replace-with-a-random-device-token",
      "replace-with-a-random-webhook-secret",
      "REPLACE-WITH-ANYTHING",
    ]) {
      process.env[NAME] = placeholder;
      expect(readSecret(NAME)).toBeNull();
    }
  });

  /**
   * Nama variabel sendiri karena catatan "sudah diperingatkan" adalah state
   * modul: memakai NAME akan mewarisi peringatan dari test di atas.
   */
  it("memperingatkan sekali saja per nama variabel", () => {
    const onceName = "TEST_SECRET_WARN_ONCE";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    process.env[onceName] = "replace-with-a-random-cron-secret";
    try {
      readSecret(onceName);
      readSecret(onceName);
      readSecret(onceName);
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      delete process.env[onceName];
    }
  });
});
