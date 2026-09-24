import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { createDatabaseAdapter } from "../lib/database-adapter";
import { MIN_PASSWORD_LENGTH, REJECTED_PASSWORDS } from "../lib/password-policy";

const prisma = new PrismaClient({ adapter: createDatabaseAdapter() });

const DEV_FALLBACK_PASSWORD = "admin123";

/**
 * A seed run counts as production whenever it targets the remote Turso
 * database, not only when NODE_ENV says so. DEPLOYMENT.md has operators seed
 * production from their own terminal, where NODE_ENV is still "development" —
 * so TURSO_DATABASE_URL is the signal that actually matters here.
 */
function isProductionTarget() {
  return (
    Boolean(process.env.TURSO_DATABASE_URL?.trim()) ||
    process.env.NODE_ENV === "production"
  );
}

function resolveAdminPassword() {
  const supplied = process.env.SEED_ADMIN_PASSWORD;
  const production = isProductionTarget();

  if (!supplied) {
    if (production) {
      throw new Error(
        "SEED_ADMIN_PASSWORD belum diisi, padahal seed ini menyasar database production.\n" +
          "Isi dulu password admin yang kuat, lalu ulangi:\n" +
          '  $env:SEED_ADMIN_PASSWORD="<password-kuat-minimal-12-karakter>"\n' +
          "  npm run db:seed",
      );
    }

    console.warn(
      `PERINGATAN: SEED_ADMIN_PASSWORD kosong, memakai password pengembangan "${DEV_FALLBACK_PASSWORD}".\n` +
        "Password ini hanya untuk database lokal dan akan ditolak bila menyasar Turso.",
    );
    return DEV_FALLBACK_PASSWORD;
  }

  /**
   * Rejected regardless of target. A self-hosted install seeds a local SQLite
   * file while NODE_ENV is still "development" (see DEPLOYMENT.md), so gating
   * this on `production` would let the .env.example placeholder become the
   * admin password of a real installation. Nobody deliberately wants these.
   */
  if (REJECTED_PASSWORDS.has(supplied.trim().toLowerCase())) {
    throw new Error(
      `SEED_ADMIN_PASSWORD berisi "${supplied}", yang ada di daftar tolak ` +
        "(nilai contoh bawaan atau password yang terlalu umum).\n" +
        "Ganti dengan password yang hanya kamu tahu sebelum menjalankan seed.",
    );
  }

  if (!production) return supplied;

  if (supplied.trim().length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `SEED_ADMIN_PASSWORD terlalu pendek (${supplied.trim().length} karakter). ` +
        `Minimal ${MIN_PASSWORD_LENGTH} karakter untuk database production.`,
    );
  }

  return supplied;
}

async function main() {
  console.log("Seeding database for KE Digital Signage...");

  // 1. Create Default Admin User
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim() || "admin@konstanta.edu";
  const adminPassword = resolveAdminPassword();
  const passwordHash = await argon2.hash(adminPassword);

  const existing = await prisma.admin.findUnique({ where: { email: adminEmail } });

  /**
   * The app has no change-password screen yet, so an installation seeded with a
   * weak password would have no way to rotate it. This opt-in flag is that way
   * out: it only ever runs when the operator asks for it explicitly, and the
   * new password still goes through every check above.
   */
  const forceReset = process.env.SEED_ADMIN_PASSWORD_RESET === "true";

  if (forceReset && !process.env.SEED_ADMIN_PASSWORD) {
    throw new Error(
      "SEED_ADMIN_PASSWORD_RESET=true tetapi SEED_ADMIN_PASSWORD kosong.\n" +
        "Isi password barunya supaya ada yang dipasang.",
    );
  }

  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    // Empty by default: re-seeding must never silently overwrite a password.
    update: forceReset ? { passwordHash } : {},
    create: {
      name: "Super Admin",
      email: adminEmail,
      passwordHash,
      isActive: true,
    },
  });

  if (!existing) {
    console.log(`Admin user created: ${admin.email}`);
  } else if (forceReset) {
    console.log(`Password admin ${admin.email} berhasil diganti.`);
  } else {
    console.log(
      `Admin ${admin.email} sudah ada, password TIDAK diubah oleh seed.\n` +
        "Bila akun ini terlanjur dibuat dengan password lemah, ganti dengan:\n" +
        '  $env:SEED_ADMIN_PASSWORD="<password-baru>"\n' +
        '  $env:SEED_ADMIN_PASSWORD_RESET="true"\n' +
        "  npm run db:seed",
    );
  }

  // Branches, rooms, tutors, programs, classes, subjects, and schedules are
  // no longer seeded here: that data is read live from the locked Google
  // Sheet (see lib/google-sheets/live-data.ts), not stored in this database.

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
