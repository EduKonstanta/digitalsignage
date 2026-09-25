import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { canonicalCardUid } from "@/lib/card-uid";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Satu unggahan dibatasi supaya tidak melewati batas waktu fungsi serverless. */
const MAX_ROWS = 1000;

/**
 * NIS dan kelas ikut pola endpoint pembuatan siswa: dibuatkan sendiri bila
 * sumber datanya tidak punya, sebab banyak ekspor hanya memuat nama dan kartu.
 */
const rowSchema = z.object({
  nis: z.string().trim().nullable().optional(),
  name: z.string().trim().min(1),
  className: z.string().trim().nullable().optional(),
  cardUid: z.string().trim().nullable().optional(),
  parentName: z.string().trim().nullable().optional(),
  parentPhone: z.string().trim().nullable().optional(),
  studentPhone: z.string().trim().nullable().optional(),
  voiceGender: z.enum(["AUTO", "MALE", "FEMALE"]).default("AUTO"),
});

const bodySchema = z.object({
  rows: z.array(rowSchema).min(1).max(MAX_ROWS),
  /**
   * "skip" membiarkan siswa yang NIS-nya sudah ada apa adanya; "update"
   * menimpanya. Bawaannya skip supaya unggahan ulang berkas yang sama tidak
   * diam-diam menimpa perbaikan yang sudah dilakukan lewat form admin.
   */
  onDuplicate: z.enum(["skip", "update"]).default("skip"),
});

interface RowOutcome {
  nis: string | null;
  name: string;
  status: "created" | "updated" | "skipped" | "failed";
  reason?: string;
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return apiError(
        issue?.code === "too_big"
          ? `Maksimal ${MAX_ROWS} baris sekali impor. Pecah berkasnya.`
          : "Data impor tidak valid.",
        "VALIDATION_ERROR",
        400,
      );
    }

    // UID disimpan kanonik, sama seperti form siswa dan pencocokan di route tap.
    const rows = parsed.data.rows.map((row) => ({
      ...row,
      cardUid: row.cardUid ? canonicalCardUid(row.cardUid) || null : null,
    }));
    const { onDuplicate } = parsed.data;

    /**
     * NIS dan cardUid keduanya unik di basis data. Memeriksanya di muka jauh
     * lebih murah daripada menunggu satu per satu gagal di tingkat constraint,
     * dan membuat laporan per baris bisa menyebut alasannya dengan jelas.
     */
    const suppliedNis = rows.map((row) => row.nis).filter((nis): nis is string => !!nis);

    // Semua pemegang kartu ikut dibaca (tabel siswa kecil) supaya UID lama yang
    // tersimpan dengan format lain tetap terdeteksi sebagai duplikat.
    const existingStudents = await db.student.findMany({
      where: {
        OR: [{ nis: { in: suppliedNis } }, { cardUid: { not: null } }],
      },
      select: { id: true, nis: true, cardUid: true, name: true },
    });

    const byNis = new Map(existingStudents.map((student) => [student.nis, student]));
    const byCard = new Map(
      existingStudents
        .filter((s) => s.cardUid)
        .map((s) => [canonicalCardUid(s.cardUid as string), s]),
    );

    const results: RowOutcome[] = [];
    let created = 0;
    let updated = 0;

    for (const row of rows) {
      const existing = row.nis ? byNis.get(row.nis) : undefined;
      const cardOwner = row.cardUid ? byCard.get(row.cardUid) : undefined;

      if (cardOwner && (!row.nis || cardOwner.nis !== row.nis)) {
        results.push({
          nis: row.nis ?? null,
          name: row.name,
          status: "failed",
          reason: `UID kartu ${row.cardUid} sudah dipakai ${cardOwner.name}`,
        });
        continue;
      }

      const data = {
        name: row.name,
        className: row.className || "Konstanta Education",
        cardUid: row.cardUid || null,
        parentName: row.parentName || null,
        parentPhone: row.parentPhone || null,
        studentPhone: row.studentPhone || null,
        voiceGender: row.voiceGender,
      };

      try {
        if (existing) {
          if (onDuplicate === "skip") {
            results.push({ nis: row.nis ?? null, name: row.name, status: "skipped", reason: "NIS sudah terdaftar" });
            continue;
          }
          const student = await db.student.update({ where: { id: existing.id }, data });
          if (student.cardUid) byCard.set(student.cardUid, { ...student });
          updated += 1;
          results.push({ nis: row.nis ?? null, name: row.name, status: "updated" });
        } else {
          const student = await db.student.create({
            data: { ...data, nis: row.nis || `RFID-${randomUUID()}`, isActive: true },
          });
          if (student.cardUid) byCard.set(student.cardUid, { ...student });
          byNis.set(student.nis, { ...student });
          created += 1;
          results.push({ nis: row.nis ?? null, name: row.name, status: "created" });
        }
      } catch (rowError) {
        results.push({
          nis: row.nis ?? null,
          name: row.name,
          status: "failed",
          reason: rowError instanceof Error ? rowError.message : "Gagal disimpan",
        });
      }
    }

    const failed = results.filter((row) => row.status === "failed").length;
    const skipped = results.filter((row) => row.status === "skipped").length;

    // Baris datanya sendiri tidak ikut dicatat: isinya data pribadi siswa.
    await logActivity({
      actorId: admin.id,
      action: "IMPORT_STUDENTS",
      entityType: "Student",
      after: { total: rows.length, created, updated, skipped, failed, onDuplicate },
    });

    return apiSuccess({ total: rows.length, created, updated, skipped, failed, results });
  } catch (error) {
    return apiError("Gagal mengimpor data siswa", "IMPORT_STUDENTS_ERROR", 500, error);
  }
}
