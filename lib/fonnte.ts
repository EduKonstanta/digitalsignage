import { db } from "@/lib/db";

export interface FonnteConfig {
  token: string;
  isEnabled: boolean;
  templateCheckIn: string;
  templateCheckOut: string;
  countryCode: string;
}

export const DEFAULT_FONNTE_TEMPLATES = {
  checkIn: `*KONSTANTA EDUCATION - NOTIFIKASI KEHADIRAN SISWA*

Yth. Bapak/Ibu Orang Tua dari:
👤 *Nama*: {nama}
🆔 *NIS*: {nis}
🏫 *Kelas*: {kelas}

✅ Ananda telah *HADIR & TAP KARTU* di bimbel *{cabang}* pada:
⏰ *Waktu*: {waktu} WIB
📅 *Tanggal*: {tanggal}

Semangat belajar dan raih impianmu bersama Konstanta Education! ✨
_Pesan otomatis dikirim oleh Digital Signage & Attendance System._`,

  checkOut: `*KONSTANTA EDUCATION - NOTIFIKASI KEPULANGAN SISWA*

Yth. Bapak/Ibu Orang Tua dari:
👤 *Nama*: {nama}
🆔 *NIS*: {nis}
🏫 *Kelas*: {kelas}

👋 Ananda telah *SELESAI SESI BIMBEL* dan melakukan tap keluar pada:
⏰ *Waktu*: {waktu} WIB
📅 *Tanggal*: {tanggal}

Terima kasih dan hati-hati di perjalanan pulang! 🚀
_Pesan otomatis dikirim oleh Digital Signage & Attendance System._`,
};

export async function getFonnteConfig(): Promise<FonnteConfig> {
  const settings = await db.systemSetting.findMany({
    where: {
      key: {
        in: [
          "fonnte_token",
          "fonnte_wa_enabled",
          "fonnte_template_checkin",
          "fonnte_template_checkout",
          "fonnte_country_code",
        ],
      },
    },
  });

  const map = new Map(settings.map((s) => [s.key, s.value]));
  const enabledSetting = map.get("fonnte_wa_enabled");

  return {
    token: process.env.FONNTE_TOKEN?.trim() || map.get("fonnte_token") || "",
    isEnabled:
      enabledSetting !== undefined
        ? enabledSetting === "true"
        : process.env.FONNTE_ENABLED === "true",
    templateCheckIn: map.get("fonnte_template_checkin") || DEFAULT_FONNTE_TEMPLATES.checkIn,
    templateCheckOut: map.get("fonnte_template_checkout") || DEFAULT_FONNTE_TEMPLATES.checkOut,
    countryCode: map.get("fonnte_country_code") || "62",
  };
}

export async function saveFonnteConfig(config: Partial<FonnteConfig>, updatedById?: string) {
  const entries: Array<{ key: string; value: string }> = [];

  if (config.token !== undefined) {
    entries.push({ key: "fonnte_token", value: config.token });
  }
  if (config.isEnabled !== undefined) {
    entries.push({ key: "fonnte_wa_enabled", value: String(config.isEnabled) });
  }
  if (config.templateCheckIn !== undefined) {
    entries.push({ key: "fonnte_template_checkin", value: config.templateCheckIn });
  }
  if (config.templateCheckOut !== undefined) {
    entries.push({ key: "fonnte_template_checkout", value: config.templateCheckOut });
  }
  if (config.countryCode !== undefined) {
    entries.push({ key: "fonnte_country_code", value: config.countryCode });
  }

  await Promise.all(
    entries.map(({ key, value }) =>
      db.systemSetting.upsert({
        where: { key },
        create: { key, value, updatedById },
        update: { value, updatedById },
      })
    )
  );
}

export interface SendFonnteResult {
  success: boolean;
  status: string;
  messageId?: string;
  response?: unknown;
  error?: string;
}

export async function sendFonnteWhatsApp(params: {
  target: string;
  message: string;
  tokenOverride?: string;
  countryCode?: string;
}): Promise<SendFonnteResult> {
  const token = params.tokenOverride || (await getFonnteConfig()).token;

  if (!token) {
    return {
      success: false,
      status: "DISABLED",
      error: "Token Fonnte belum dikonfigurasi",
    };
  }

  // Sanitize phone number (remove spaces, dashes, parentheses)
  let cleanTarget = params.target.replace(/[^0-9]/g, "");
  if (cleanTarget.startsWith("0")) {
    cleanTarget = "62" + cleanTarget.slice(1);
  }

  if (!cleanTarget) {
    return {
      success: false,
      status: "FAILED",
      error: "Nomor WhatsApp target tidak valid",
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("target", cleanTarget);
    formData.append("message", params.message);
    formData.append("countryCode", params.countryCode || "62");

    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
      },
      body: formData,
      signal: AbortSignal.timeout(10_000),
    });

    const body = (await response.json()) as {
      status?: boolean;
      detail?: string;
      reason?: string;
      process?: string;
      id?: string[];
      target?: string[];
    };

    if (body.status === true) {
      return {
        success: true,
        status: "QUEUED",
        messageId: body.id?.[0],
        response: body,
      };
    } else {
      return {
        success: false,
        status: "FAILED",
        error: body.reason || body.detail || "Gagal mengirim WhatsApp melalui Fonnte",
        response: body,
      };
    }
  } catch (err) {
    return {
      success: false,
      status: "FAILED",
      error: err instanceof Error ? err.message : "Network error ke Fonnte API",
    };
  }
}

export async function checkFonnteDeviceStatus(tokenOverride?: string) {
  const token = tokenOverride || (await getFonnteConfig()).token;

  if (!token) {
    return {
      status: false,
      message: "Token Fonnte belum diatur.",
      device_status: "disconnected",
    };
  }

  try {
    const response = await fetch("https://api.fonnte.com/device", {
      method: "POST",
      headers: {
        Authorization: token,
      },
      signal: AbortSignal.timeout(10_000),
    });

    const data = await response.json();
    return data;
  } catch (err) {
    return {
      status: false,
      message: err instanceof Error ? err.message : "Gagal terhubung ke API Fonnte",
      device_status: "error",
    };
  }
}

export function formatAttendanceMessage(params: {
  template: string;
  studentName: string;
  nis: string;
  className: string;
  timeStr: string;
  dateStr: string;
  branchName?: string;
  type?: "CHECK_IN" | "CHECK_OUT";
}): string {
  const branch = params.branchName || "Konstanta Education";
  return params.template
    .replace(/{nama}/g, params.studentName)
    .replace(/{name}/g, params.studentName)
    .replace(/{nis}/g, params.nis)
    .replace(/{kelas}/g, params.className)
    .replace(/{class}/g, params.className)
    .replace(/{waktu}/g, params.timeStr)
    .replace(/{time}/g, params.timeStr)
    .replace(/{tanggal}/g, params.dateStr)
    .replace(/{date}/g, params.dateStr)
    .replace(/{cabang}/g, branch)
    .replace(/{branch}/g, branch)
    .replace(/{tipe}/g, params.type === "CHECK_OUT" ? "Pulang" : "Masuk");
}
