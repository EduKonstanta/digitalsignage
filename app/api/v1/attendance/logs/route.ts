import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date"); // YYYY-MM-DD
    const studentId = searchParams.get("studentId");
    const className = searchParams.get("className");
    const type = searchParams.get("type");
    const limit = Math.min(Number(searchParams.get("limit") || 50), 200);

    const where: Record<string, unknown> = {};

    if (studentId) {
      where.studentId = studentId;
    }

    if (className) {
      where.className = className;
    }

    if (type) {
      where.type = type;
    }

    if (date) {
      const startOfDay = new Date(`${date}T00:00:00+07:00`);
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      where.timestamp = {
        gte: startOfDay,
        lt: endOfDay,
      };
    }

    const logs = await db.attendanceLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: limit,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            nis: true,
            className: true,
            parentPhone: true,
            photoUrl: true,
          },
        },
      },
    });

    return apiSuccess(logs);
  } catch (error) {
    console.error("Failed to fetch attendance logs:", error);
    return apiError("Gagal memuat riwayat presensi", "FETCH_ATTENDANCE_ERROR", 500, error);
  }
}
