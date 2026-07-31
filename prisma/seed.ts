import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { createDatabaseAdapter } from "../lib/database-adapter";

const prisma = new PrismaClient({ adapter: createDatabaseAdapter() });

async function main() {
  console.log("Seeding database for KE Digital Signage...");

  // 1. Create Default Admin User
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim() || "admin@konstanta.edu";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin123";
  const passwordHash = await argon2.hash(adminPassword);
  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Super Admin",
      email: adminEmail,
      passwordHash,
      isActive: true,
    },
  });
  console.log(`Admin user created/verified: ${admin.email}`);

  // 2. Create Branch
  const branch = await prisma.branch.upsert({
    where: { code: "KE-JKT-01" },
    update: {},
    create: {
      name: "Konstanta Cabang Utama Jakarta",
      code: "KE-JKT-01",
      address: "Jl. Pendidikan No. 45, Jakarta",
      timezone: "Asia/Jakarta",
      isActive: true,
    },
  });

  // 3. Create Rooms
  const room201 = await prisma.room.create({
    data: {
      branchId: branch.id,
      name: "Ruang 201 (Lt 2)",
      floor: 2,
      capacity: 25,
      aliases: JSON.stringify(["R201", "Lab 201"]),
    },
  });

  const room102 = await prisma.room.create({
    data: {
      branchId: branch.id,
      name: "Ruang 102 (Lt 1)",
      floor: 1,
      capacity: 30,
      aliases: JSON.stringify(["R102"]),
    },
  });

  // 4. Create Tutors
  const tutorFikri = await prisma.tutor.create({
    data: {
      name: "Fikri Ramadhan",
      displayName: "Kang Guru Fikri, S.Si",
      title: "Master Tutor SNBT & TPS",
      aliases: JSON.stringify(["Fikri", "KG Fikri"]),
    },
  });

  const tutorAnita = await prisma.tutor.create({
    data: {
      name: "Anita Rahmawati",
      displayName: "Kang Guru Anita, M.Pd",
      title: "Senior Tutor Bahasa",
      aliases: JSON.stringify(["Anita", "KG Anita"]),
    },
  });

  // 5. Create Programs & Classes
  const programELC =
    (await prisma.program.findFirst({ where: { name: "ELC" } })) ??
    (await prisma.program.create({
      data: {
        name: "ELC",
        level: "Kelas 9-12",
        color: "#14B8A6",
      },
    }));

  await prisma.program.update({
    where: { id: programELC.id },
    data: {
      level: "Kelas 9-12",
      color: "#14B8A6",
      isActive: true,
    },
  });

  const programPrivat =
    (await prisma.program.findFirst({ where: { name: "Privat" } })) ??
    (await prisma.program.create({
      data: {
        name: "Privat",
        level: "Program Privat",
        color: "#8B5CF6",
      },
    }));

  await prisma.program.update({
    where: { id: programPrivat.id },
    data: {
      level: "Program Privat",
      color: "#8B5CF6",
      isActive: true,
    },
  });

  const classNames = [
    "12 ELC G",
    "12 ELC I",
    "12 ELC E",
    "11 ELC G",
    "11 ELC I",
    "10 ELC",
    "9 ELC",
  ];

  const classes = [];
  for (const className of classNames) {
    const existingClass = await prisma.class.findFirst({
      where: { programId: programELC.id, name: className },
    });

    classes.push(
      existingClass ??
        (await prisma.class.create({
          data: {
            programId: programELC.id,
            name: className,
            academicYear: "2026/2027",
            isActive: true,
          },
        })),
    );
  }

  const class12ELCG = classes[0];

  // 6. Create Subject
  const subjectMat = await prisma.subject.create({
    data: {
      name: "Penalaran Matematika",
      shortName: "Pen. Mat",
      icon: "calculator",
    },
  });

  // 7. Create Demo Schedule
  const now = new Date();
  const startAt = new Date(now.getTime() - 15 * 60 * 1000); // started 15 mins ago
  const endAt = new Date(now.getTime() + 75 * 60 * 1000); // ends in 75 mins

  await prisma.schedule.create({
    data: {
      branchId: branch.id,
      programId: programELC.id,
      classId: class12ELCG.id,
      subjectId: subjectMat.id,
      tutorId: tutorFikri.id,
      roomId: room201.id,
      startAt,
      endAt,
      manualStatus: "NONE",
      notes: "Pembahasan soal HOTS Penalaran Matematika",
      publishedAt: now,
    },
  });

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
