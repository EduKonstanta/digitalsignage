import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const className = searchParams.get("className")?.trim();
    const isActive = searchParams.get("isActive");

    const where: Record<string, unknown> = {};

    if (q) {
      where.OR = [
        { name: { contains: q } },
        { nis: { contains: q } },
        { cardUid: { contains: q } },
        { parentPhone: { contains: q } },
      ];
    }

    if (className) {
      where.className = className;
    }

    if (isActive !== null && isActive !== undefined && isActive !== "") {
      where.isActive = isActive === "true";
    }

    const students = await db.student.findMany({
      where,
      orderBy: [{ className: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: { attendances: true },
        },
      },
    });

    return apiSuccess(students);
  } catch (error) {
    console.error("Failed to fetch students:", error);
    return apiError("Gagal mengambil daftar siswa", "FETCH_STUDENTS_ERROR", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const body = await req.json();
    const {
      nis,
      name,
      cardUid,
      className,
      voiceGender = "AUTO",
      branchId,
      parentName,
      parentPhone,
      studentPhone,
      photoUrl,
      isActive = true,
    } = body;

    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedCard = typeof cardUid === "string" ? cardUid.trim() : "";
    const internalNis = typeof nis === "string" && nis.trim()
      ? nis.trim()
      : `RFID-${randomUUID()}`;
    const internalClassName = typeof className === "string" && className.trim()
      ? className.trim()
      : "Konstanta Education";

    if (!trimmedName || !trimmedCard) {
      return apiError("Nama siswa dan UID kartu RFID wajib diisi", "VALIDATION_ERROR", 400);
    }

    const normalizedVoiceGender = String(voiceGender).trim().toUpperCase();
    if (!["AUTO", "MALE", "FEMALE"].includes(normalizedVoiceGender)) {
      return apiError("Gender suara harus AUTO, MALE, atau FEMALE", "VALIDATION_ERROR", 400);
    }

    // Check duplicate NIS
    const existingNis = await db.student.findUnique({
      where: { nis: internalNis },
    });
    if (existingNis) {
      return apiError("Identitas internal siswa sudah digunakan", "DUPLICATE_NIS", 409);
    }

    // Check duplicate Card UID if supplied
    const existingCard = await db.student.findUnique({
      where: { cardUid: trimmedCard },
    });
    if (existingCard) {
      return apiError(
        `UID Kartu ${trimmedCard} sudah digunakan oleh siswa lain (${existingCard.name})`,
        "DUPLICATE_CARD_UID",
        409
      );
    }

    const student = await db.student.create({
      data: {
        nis: internalNis,
        name: trimmedName,
        cardUid: trimmedCard,
        className: internalClassName,
        voiceGender: normalizedVoiceGender,
        branchId: branchId || null,
        parentName: parentName?.trim() || null,
        parentPhone: parentPhone?.trim() || null,
        studentPhone: studentPhone?.trim() || null,
        photoUrl: photoUrl?.trim() || null,
        isActive: Boolean(isActive),
      },
    });

    await logActivity({
      actorId: admin.id,
      action: "CREATE_STUDENT",
      entityType: "Student",
      entityId: student.id,
      after: student,
    });

    return apiSuccess(student, undefined, 201);
  } catch (error) {
    console.error("Failed to create student:", error);
    return apiError("Gagal mendaftarkan siswa baru", "CREATE_STUDENT_ERROR", 500, error);
  }
}
