import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { sendFonnteWhatsApp } from "@/lib/fonnte";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const body = await req.json();
    const { target, message, token } = body as {
      target: string;
      message?: string;
      token?: string;
    };

    if (!target) {
      return apiError("Nomor WhatsApp tujuan wajib diisi", "VALIDATION_ERROR", 400);
    }

    const testMessage =
      message ||
      `*TES KONEKSI FONNTE - KONSTANTA EDUCATION*\n\n` +
      `Halo! Ini adalah pesan uji coba integrasi WhatsApp Gateway Fonnte dari Digital Signage & Presensi Siswa Konstanta Education.\n\n` +
      `⏰ Waktu: ${new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        dateStyle: "full",
        timeStyle: "medium",
      }).format(new Date())} WIB\n\n` +
      `✅ Integrasi WhatsApp Fonnte Berfungsi dengan Baik!`;

    const result = await sendFonnteWhatsApp({
      target,
      message: testMessage,
      tokenOverride: token,
    });

    if (result.success) {
      return apiSuccess(result);
    } else {
      return apiError(
        result.error || "Gagal mengirim pesan melalui Fonnte",
        "FONNTE_SEND_ERROR",
        400,
        result.response
      );
    }
  } catch (error) {
    console.error("Failed to send test WhatsApp via Fonnte:", error);
    return apiError("Gagal mengirim pesan uji coba WhatsApp", "TEST_SEND_ERROR", 500, error);
  }
}
