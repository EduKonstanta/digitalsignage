import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { canonicalCardUid, findCardConflict } from "@/lib/card-uid";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

/** Nilai opsional dari body JSON; bukan string (mis. angka) tidak lagi membuat .trim() melempar. */
function optionalText(value: unknown) {
  if (value === undefined || value === null) return null;
  return String(value).trim() || null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await params;
    const student = await db.student.findUnique({
      where: { id },
      include: {
        attendances: {
          orderBy: { timestamp: "desc" },
          take: 20,
        },
      },
    });

    if (!student) {
      return apiError("Siswa tidak ditemukan", "NOT_FOUND", 404);
    }

    return apiSuccess(student);
  } catch (error) {
    return apiError("Gagal mengambil data siswa", "FETCH_STUDENT_ERROR", 500, error);
  }
}

/**
 * Semua route [id] lain di API ini memakai PATCH, dan MasterCrudPage — komponen
 * bersama yang dipakai halaman Data Siswa — juga mengirim PATCH saat menyimpan
 * perubahan. Route ini semula hanya mengekspor PUT, sehingga tombol Edit selalu
 * gagal dengan 405. PATCH kini jadi yang utama; PUT tetap ada sebagai alias
 * untuk pemanggil lama.
 */
async function updateStudent(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await params;
    const body = await req.json();
    const {
      nis,
      name,
      cardUid,
      className,
      voiceGender,
      branchId,
      parentName,
      parentPhone,
      studentPhone,
      photoUrl,
      isActive,
    } = body;

    const existing = await db.student.findUnique({
      where: { id },
    });

    if (!existing) {
      return apiError("Siswa tidak ditemukan", "NOT_FOUND", 404);
    }

    if (nis !== undefined && !String(nis).trim()) {
      return apiError("NIS wajib diisi", "VALIDATION_ERROR", 400);
    }

    if (name !== undefined && !String(name).trim()) {
      return apiError("Nama wajib diisi", "VALIDATION_ERROR", 400);
    }

    if (cardUid !== undefined && !canonicalCardUid(String(cardUid ?? ""))) {
      return apiError("UID kartu RFID wajib diisi", "VALIDATION_ERROR", 400);
    }

    if (className !== undefined && !String(className).trim()) {
      return apiError("Kelas/Rombel wajib diisi", "VALIDATION_ERROR", 400);
    }

    const trimmedNis = nis === undefined ? undefined : String(nis).trim();

    // Check duplicate NIS if changed
    if (trimmedNis && trimmedNis !== existing.nis) {
      const duplicateNis = await db.student.findUnique({
        where: { nis: trimmedNis },
      });
      if (duplicateNis) {
        return apiError(`NIS ${nis} sudah digunakan oleh siswa lain`, "DUPLICATE_NIS", 409);
      }
    }

    // Disimpan kanonik dan dicek duplikat secara kanonik, sama seperti route tap.
    const trimmedCard = cardUid === undefined ? undefined : canonicalCardUid(String(cardUid));
    if (trimmedCard) {
      const cardHolders = await db.student.findMany({
        where: { cardUid: { not: null } },
        select: { id: true, cardUid: true },
      });
      const duplicateCard = findCardConflict(cardHolders, trimmedCard, id);
      if (duplicateCard) {
        return apiError(
          `UID Kartu ${trimmedCard} sudah digunakan oleh siswa lain`,
          "DUPLICATE_CARD_UID",
          409
        );
      }
    }

    const normalizedVoiceGender = voiceGender === undefined
      ? undefined
      : String(voiceGender).trim().toUpperCase();
    if (
      normalizedVoiceGender !== undefined &&
      !["AUTO", "MALE", "FEMALE"].includes(normalizedVoiceGender)
    ) {
      return apiError("Gender suara harus AUTO, MALE, atau FEMALE", "VALIDATION_ERROR", 400);
    }

    const updated = await db.student.update({
      where: { id },
      data: {
        ...(trimmedNis !== undefined ? { nis: trimmedNis } : {}),
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(cardUid !== undefined ? { cardUid: trimmedCard || null } : {}),
        ...(className !== undefined ? { className: String(className).trim() } : {}),
        ...(normalizedVoiceGender !== undefined ? { voiceGender: normalizedVoiceGender } : {}),
        ...(branchId !== undefined ? { branchId: branchId || null } : {}),
        ...(parentName !== undefined ? { parentName: optionalText(parentName) } : {}),
        ...(parentPhone !== undefined ? { parentPhone: optionalText(parentPhone) } : {}),
        ...(studentPhone !== undefined ? { studentPhone: optionalText(studentPhone) } : {}),
        ...(photoUrl !== undefined ? { photoUrl: optionalText(photoUrl) } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });

    await logActivity({
      actorId: admin.id,
      action: "UPDATE_STUDENT",
      entityType: "Student",
      entityId: id,
      after: updated,
    });

    return apiSuccess(updated);
  } catch (error) {
    return apiError("Gagal memperbarui data siswa", "UPDATE_STUDENT_ERROR", 500, error);
  }
}

export const PATCH = updateStudent;
export const PUT = updateStudent;

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { id } = await params;
    const existing = await db.student.findUnique({
      where: { id },
      include: { _count: { select: { attendances: true } } },
    });
    if (!existing) return apiError("Siswa tidak ditemukan", "STUDENT_NOT_FOUND", 404);

    /**
     * AttendanceLog memakai onDelete: Cascade, jadi menghapus siswa ikut
     * memusnahkan seluruh riwayat kehadirannya tanpa peringatan. Riwayat itu
     * catatan sekolah, bukan data turunan — jadi hapus ditolak selama masih ada
     * presensi, dan operator diarahkan menonaktifkan siswa saja.
     */
    if (existing._count.attendances > 0) {
      return apiError(
        `${existing.name} sudah punya ${existing._count.attendances} catatan presensi, jadi tidak bisa dihapus. ` +
          `Data siswa dipertahankan agar riwayat tap pada Digital Signage tidak hilang.`,
        "STUDENT_HAS_ATTENDANCE",
        409,
      );
    }

    await db.student.delete({
      where: { id },
    });

    await logActivity({
      actorId: admin.id,
      action: "DELETE_STUDENT",
      entityType: "Student",
      entityId: id,
      before: existing,
    });

    return apiSuccess({ id });
  } catch (error) {
    return apiError("Gagal menghapus data siswa", "DELETE_STUDENT_ERROR", 500, error);
  }
}
