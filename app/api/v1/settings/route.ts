import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

const SETTING_KEYS = ["appName", "branchName", "eventLabel", "eventDate", "prayerCity"] as const;

const settingsSchema = z.object({
  appName: z.string().min(2, "Judul aplikasi wajib diisi"),
  branchName: z.string().min(2, "Nama cabang wajib diisi"),
  eventLabel: z.string().max(40, "Nama acara maksimal 40 karakter").optional().or(z.literal("")),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid")
    .optional()
    .or(z.literal("")),
  prayerCity: z.string().min(2, "Nama kota minimal 2 karakter").default("Jakarta"),
});

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const rows = await db.systemSetting.findMany({
      where: { key: { in: [...SETTING_KEYS] } },
    });
    const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));

    return apiSuccess(settings);
  } catch (error) {
    return apiError("Gagal mengambil pengaturan", "SETTINGS_FETCH_ERROR", 500, error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const validated = settingsSchema.parse(await req.json());

    await db.$transaction(
      SETTING_KEYS.map((key) => {
        const value = validated[key] ?? "";
        return db.systemSetting.upsert({
          where: { key },
          update: { value, updatedById: admin.id },
          create: { key, value, updatedById: admin.id },
        });
      }),
    );

    await logActivity({
      actorId: admin.id,
      action: "UPDATE_SETTINGS",
      entityType: "SystemSetting",
      after: validated,
    });

    return apiSuccess(validated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal menyimpan pengaturan", "SETTINGS_UPDATE_ERROR", 500, error);
  }
}
