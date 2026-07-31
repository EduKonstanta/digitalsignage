import { getAdminFromSession } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  const admin = await getAdminFromSession();
  if (!admin) {
    return apiError("Sesi tidak aktif atau telah berakhir", "UNAUTHORIZED", 401);
  }

  return apiSuccess({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    lastLoginAt: admin.lastLoginAt,
  });
}
