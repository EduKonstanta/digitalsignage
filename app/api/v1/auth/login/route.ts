import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = loginSchema.parse(body);

    const admin = await db.admin.findUnique({
      where: { email: validated.email },
    });

    if (!admin || !admin.isActive) {
      return apiError("Email atau password tidak sesuai", "INVALID_CREDENTIALS", 401);
    }

    const isValid = await verifyPassword(validated.password, admin.passwordHash);
    if (!isValid) {
      return apiError("Email atau password tidak sesuai", "INVALID_CREDENTIALS", 401);
    }

    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    await createSession(admin.id, ipAddress, userAgent);

    await db.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    return apiSuccess({
      id: admin.id,
      name: admin.name,
      email: admin.email,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Validasi input gagal", "VALIDATION_ERROR", 400, error.issues);
    }
    return apiError("Gagal memproses autentikasi", "LOGIN_ERROR", 500, error);
  }
}
