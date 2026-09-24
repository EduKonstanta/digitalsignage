import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { searchParams } = new URL(req.url);
    const take = Math.min(Number(searchParams.get("take") ?? 50) || 50, 200);

    const logs = await db.activityLog.findMany({
      include: { admin: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take,
    });

    return apiSuccess(logs);
  } catch (error) {
    return apiError("Gagal mengambil log aktivitas", "ACTIVITY_LOG_FETCH_ERROR", 500, error);
  }
}
