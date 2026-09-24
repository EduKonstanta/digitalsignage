import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { Prisma } from "@prisma/client";

const announcementSchema = z.object({
  title: z.string().min(3, "Judul minimal 3 karakter"),
  summary: z.string().optional(),
  body: z.string().min(3, "Isi pengumuman wajib diisi"),
  category: z.string().min(1).default("GENERAL"),
  priority: z.number().int().min(1).max(3).default(1),
  icon: z.string().optional(),
  imageUrl: z.string().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "EXPIRED", "ARCHIVED"]),
});

function slugify(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const announcements = await db.announcement.findMany({
      where: { archivedAt: null },
      orderBy: [{ priority: "desc" }, { startsAt: "desc" }],
    });
    return apiSuccess(announcements);
  } catch (error) {
    return apiError("Gagal mengambil pengumuman", "ANNOUNCEMENT_FETCH_ERROR", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const validated = announcementSchema.parse(await req.json());
    const startsAt = new Date(validated.startsAt);
    const endsAt = new Date(validated.endsAt);
    if (endsAt <= startsAt) {
      return apiError("Waktu selesai harus setelah waktu mulai", "INVALID_TIME_RANGE", 400);
    }

    const base = slugify(validated.title) || "pengumuman";

    // Retry on the DB's unique-constraint response instead of check-then-create,
    // which is safe under concurrent requests for the same title.
    let attempt = 0;
    for (;;) {
      const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
      try {
        const announcement = await db.announcement.create({
          data: {
            ...validated,
            slug,
            startsAt,
            endsAt,
            createdById: admin.id,
            publishedAt: validated.status === "PUBLISHED" ? new Date() : null,
          },
        });
        await logActivity({
          actorId: admin.id,
          action: "CREATE_ANNOUNCEMENT",
          entityType: "Announcement",
          entityId: announcement.id,
          after: announcement,
        });
        return apiSuccess(announcement, undefined, 201);
      } catch (createError) {
        if (isUniqueConstraintError(createError) && attempt < 20) {
          attempt += 1;
          continue;
        }
        throw createError;
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal membuat pengumuman", "ANNOUNCEMENT_CREATE_ERROR", 500, error);
  }
}
