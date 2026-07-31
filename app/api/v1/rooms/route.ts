import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { z } from "zod";

const roomSchema = z.object({
  branchId: z.string().min(1, "Branch ID required"),
  name: z.string().min(1, "Nama ruangan required"),
  floor: z.number().default(1),
  capacity: z.number().optional(),
  status: z.string().default("AVAILABLE"),
  aliases: z.array(z.string()).default([]),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");

    const rooms = await db.room.findMany({
      where: branchId ? { branchId } : undefined,
      include: {
        branch: true,
        _count: { select: { schedules: true, screens: true } },
      },
      orderBy: [{ branchId: "asc" }, { floor: "asc" }, { name: "asc" }],
    });

    return apiSuccess(rooms);
  } catch (error) {
    return apiError("Gagal mengambil data ruangan", "ROOM_FETCH_ERROR", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = roomSchema.parse(body);

    const room = await db.room.create({
      data: {
        ...validated,
        aliases: JSON.stringify(validated.aliases),
      },
    });

    return apiSuccess(room, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal membuat ruangan", "ROOM_CREATE_ERROR", 500, error);
  }
}
