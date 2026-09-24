import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const runningTextSchema = z.object({
  text: z.string().min(3, "Teks ticker wajib diisi"),
  speed: z.number().int().min(5).max(120),
  separator: z.string().min(1).max(10),
  priority: z.number().int().min(1).max(3),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "EXPIRED", "ARCHIVED"]),
});

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const tickers = await db.runningText.findMany({
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    });
    return apiSuccess(tickers);
  } catch (error) {
    return apiError("Gagal mengambil running text", "RUNNING_TEXT_FETCH_ERROR", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const validated = runningTextSchema.parse(await req.json());
    const startsAt = new Date(validated.startsAt);
    const endsAt = new Date(validated.endsAt);
    if (endsAt <= startsAt) {
      return apiError("Waktu selesai harus setelah waktu mulai", "INVALID_TIME_RANGE", 400);
    }
    const ticker = await db.runningText.create({
      data: {
        ...validated,
        startsAt,
        endsAt,
        createdById: admin.id,
      },
    });
    return apiSuccess(ticker, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal membuat running text", "RUNNING_TEXT_CREATE_ERROR", 500, error);
  }
}
