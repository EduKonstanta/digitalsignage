import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { db } from "@/lib/db";

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
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

async function uniqueSlug(title: string) {
  const base = slugify(title) || "pengumuman";
  let slug = base;
  let sequence = 2;
  while (await db.announcement.findUnique({ where: { slug } })) {
    slug = `${base}-${sequence}`;
    sequence += 1;
  }
  return slug;
}

export async function GET() {
  try {
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
    const validated = announcementSchema.parse(await req.json());
    const startsAt = new Date(validated.startsAt);
    const endsAt = new Date(validated.endsAt);
    if (endsAt <= startsAt) {
      return apiError("Waktu selesai harus setelah waktu mulai", "INVALID_TIME_RANGE", 400);
    }

    const announcement = await db.announcement.create({
      data: {
        ...validated,
        slug: await uniqueSlug(validated.title),
        startsAt,
        endsAt,
        createdById: "admin",
        publishedAt: validated.status === "PUBLISHED" ? new Date() : null,
      },
    });
    return apiSuccess(announcement, undefined, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal membuat pengumuman", "ANNOUNCEMENT_CREATE_ERROR", 500, error);
  }
}
