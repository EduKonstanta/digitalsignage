import argon2 from "argon2";
import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE_NAME = "ke_admin_session";
const SESSION_EXPIRY_DAYS = 7;

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(adminId: string, ipAddress?: string, userAgent?: string) {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const sessionTokenHash = hashToken(sessionToken);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await db.authSession.create({
    data: {
      adminId,
      sessionTokenHash,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return sessionToken;
}

export async function getAdminFromSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) return null;

    const sessionTokenHash = hashToken(token);
    const session = await db.authSession.findUnique({
      where: { sessionTokenHash },
      include: { admin: true },
    });

    if (!session || session.revokedAt || new Date() > session.expiresAt) {
      return null;
    }

    if (!session.admin.isActive) {
      return null;
    }

    return session.admin;
  } catch {
    return null;
  }
}

export async function revokeCurrentSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      const sessionTokenHash = hashToken(token);
      await db.authSession.updateMany({
        where: { sessionTokenHash },
        data: { revokedAt: new Date() },
      });
    }

    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch {
    // Ignore cookie deletion errors
  }
}
