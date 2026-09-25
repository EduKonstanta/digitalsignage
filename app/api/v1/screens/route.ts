import { NextRequest } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { getLiveAcademicData } from "@/lib/google-sheets/live-data";
import { z } from "zod";

const screenSchema = z.object({
  name: z.string().min(2, "Nama layar wajib diisi"),
  branchId: z.string().min(1, "Cabang wajib dipilih"),
  roomId: z.string().optional(),
  resolution: z.string().default("1920x1080"),
  orientation: z.enum(["LANDSCAPE", "PORTRAIT"]).default("LANDSCAPE"),
});

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const [screens, live] = await Promise.all([
      db.screen.findMany({
        where: { revokedAt: null },
        include: { playlist: true },
        orderBy: [{ status: "asc" }, { name: "asc" }],
      }),
      getLiveAcademicData(),
    ]);

    const enriched = screens.map((screen) => ({
      ...screen,
      branch: live.branches.find((branch) => branch.id === screen.branchId) ?? null,
      room: screen.roomId ? (live.rooms.find((room) => room.id === screen.roomId) ?? null) : null,
    }));

    return apiSuccess(enriched);
  } catch (error) {
    return apiError("Gagal mengambil data layar", "SCREEN_FETCH_ERROR", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const body = await req.json();
    const validated = screenSchema.parse(body);

    const live = await getLiveAcademicData();
    const branch = live.branches.find((item) => item.id === validated.branchId);
    if (!branch) return apiError("Cabang tidak ditemukan", "BRANCH_NOT_FOUND", 404);

    let room = null;
    if (validated.roomId) {
      room = live.rooms.find((item) => item.id === validated.roomId);
      if (!room) return apiError("Ruangan tidak ditemukan", "ROOM_NOT_FOUND", 404);
    }

    const deviceId = `SCR-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;

    const screen = await db.screen.create({
      data: {
        deviceId,
        name: validated.name,
        branchId: validated.branchId,
        roomId: validated.roomId,
        resolution: validated.resolution,
        orientation: validated.orientation,
        // Baru jadi ONLINE saat TV membuka /display?screen=<deviceId> pertama kali.
        status: "OFFLINE",
      },
    });
    const enriched = { ...screen, branch, room };

    await logActivity({
      actorId: admin.id,
      action: "CREATE_SCREEN",
      entityType: "Screen",
      entityId: screen.id,
      after: enriched,
    });

    return apiSuccess(enriched, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal mendaftarkan layar", "SCREEN_CREATE_ERROR", 500, error);
  }
}
