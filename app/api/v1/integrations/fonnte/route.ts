import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { checkFonnteDeviceStatus, getFonnteConfig, saveFonnteConfig } from "@/lib/fonnte";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const config = await getFonnteConfig();
    let deviceStatus: unknown = null;

    if (config.token) {
      deviceStatus = await checkFonnteDeviceStatus(config.token);
    }

    return apiSuccess({
      config: {
        token: config.token ? `${config.token.slice(0, 4)}••••••••${config.token.slice(-4)}` : "",
        hasToken: Boolean(config.token),
        isEnabled: config.isEnabled,
        templateCheckIn: config.templateCheckIn,
        templateCheckOut: config.templateCheckOut,
        countryCode: config.countryCode,
      },
      device: deviceStatus,
    });
  } catch (error) {
    console.error("Failed to fetch Fonnte settings:", error);
    return apiError("Gagal mengambil pengaturan Fonnte", "FONNTE_FETCH_ERROR", 500, error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const body = await req.json();
    const { token, isEnabled, templateCheckIn, templateCheckOut, countryCode } = body;

    await saveFonnteConfig({
      ...(token !== undefined ? { token: token.trim() } : {}),
      ...(isEnabled !== undefined ? { isEnabled: Boolean(isEnabled) } : {}),
      ...(templateCheckIn !== undefined ? { templateCheckIn } : {}),
      ...(templateCheckOut !== undefined ? { templateCheckOut } : {}),
      ...(countryCode !== undefined ? { countryCode: countryCode.trim() } : {}),
    }, admin.id);

    const updatedConfig = await getFonnteConfig();

    return apiSuccess({
      hasToken: Boolean(updatedConfig.token),
      isEnabled: updatedConfig.isEnabled,
      templateCheckIn: updatedConfig.templateCheckIn,
      templateCheckOut: updatedConfig.templateCheckOut,
      countryCode: updatedConfig.countryCode,
    });
  } catch (error) {
    console.error("Failed to save Fonnte settings:", error);
    return apiError("Gagal menyimpan pengaturan Fonnte", "FONNTE_SAVE_ERROR", 500, error);
  }
}
