import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { getLiveDataStatus } from "@/lib/google-sheets/live-data";
import { clearAcademicStore, countLocalOverrides } from "@/lib/academic-store";

export const maxDuration = 60;

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  try {
    const [status, overrides] = await Promise.all([getLiveDataStatus(), countLocalOverrides()]);
    return apiSuccess({ ...status, overrides });
  } catch (error) {
    return apiError("Gagal membaca status Google Sheets", "GOOGLE_SHEETS_STATUS_ERROR", 500, error);
  }
}

/**
 * Sinkronisasi ulang: hapus seluruh perubahan lokal sehingga isi Google Sheet
 * kembali menjadi acuan tunggal. Perubahan yang dibuat lewat form admin hilang,
 * jadi UI wajib meminta konfirmasi sebelum memanggil ini.
 */
export async function DELETE() {
  const admin = await requireAdmin();
  if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  try {
    const removed = await clearAcademicStore(admin.id);
    const [status, overrides] = await Promise.all([
      getLiveDataStatus({ force: true }),
      countLocalOverrides(),
    ]);
    return apiSuccess({ ...status, overrides, removed });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Gagal menyinkronkan ulang dari Google Sheets",
      "GOOGLE_SHEETS_RESYNC_ERROR",
      500,
    );
  }
}

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  try {
    const [status, overrides] = await Promise.all([
      getLiveDataStatus({ force: true }),
      countLocalOverrides(),
    ]);
    return apiSuccess({ ...status, overrides });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Gagal memuat ulang data dari Google Sheets",
      "GOOGLE_SHEETS_RELOAD_ERROR",
      500,
    );
  }
}
