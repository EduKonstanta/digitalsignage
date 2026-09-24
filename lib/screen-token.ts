"use client";

import { SCREEN_TOKEN_HEADER } from "@/lib/constants";

const STORAGE_KEY = "ke-signage-device-token";

/** Token perangkat hasil pairing, tersimpan di localStorage layar TV. */
export function readScreenToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveScreenToken(token: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Mode privat / storage diblokir: layar tetap jalan, hanya tanpa presensi.
  }
}

export function clearScreenToken() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // abaikan
  }
}

/** Header autentikasi untuk endpoint presensi; kosong bila belum dipasangkan. */
export function screenAuthHeaders(): Record<string, string> {
  const token = readScreenToken();
  return token ? { [SCREEN_TOKEN_HEADER]: token } : {};
}

/** Tukar kode pairing 6 digit dengan token perangkat, lalu simpan. */
export async function claimScreenToken(pairingCode: string) {
  const response = await fetch("/api/v1/screens/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pairingCode }),
  });
  const body = (await response.json()) as {
    success: boolean;
    data?: { deviceToken: string; screen: { id: string; name: string } };
    error?: { message?: string };
  };

  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error?.message ?? "Gagal memasangkan perangkat.");
  }

  saveScreenToken(body.data.deviceToken);
  return body.data.screen;
}
