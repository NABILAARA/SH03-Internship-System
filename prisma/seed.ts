import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────
//  Email seed/dummy yang TIDAK dihitung sebagai akun real
// ─────────────────────────────────────────────────────────────────
const DUMMY_PATTERNS = ["@lexa.com", "@example.com", "dummy", "applicant"];

// ─────────────────────────────────────────────────────────────────
//  Ambil ringkasan database sebelum seed dijalankan
// ─────────────────────────────────────────────────────────────────
async function getDbSnapshot() {
  const realWhere = {
    AND: DUMMY_PATTERNS.map((p) => ({ email: { not: { contains: p } } })),
  };

  const [
    totalUsers,
    realUsers,
    realSamples,
    logbooks,
    evaluations,
    certificates,
    applications,
    programs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: realWhere }),
    prisma.user.findMany({ where: realWhere, select: { name: true, email: true }, take: 5 }),
    prisma.logbook.count(),
    prisma.evaluation.count(),
    prisma.certificate.count(),
    prisma.application.count(),
    prisma.internshipProgram.count(),
  ]);

  return { totalUsers, realUsers, realSamples, logbooks, evaluations, certificates, applications, programs };
}

// ─────────────────────────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║         LEXA Internship — DB Seed        ║");
  console.log("╚══════════════════════════════════════════╝\n");

  // ── [1] Wajib SEED_DEFAULT_PASSWORD ───────────────────────────
  const seedPassword = process.env.SEED_DEFAULT_PASSWORD;
  if (!seedPassword) {
    console.error("  ❌  SEED DIBLOKIR\n");
    console.error("  Alasan : SEED_DEFAULT_PASSWORD belum di-set di .env");
    console.error("  Solusi : Tambahkan SEED_DEFAULT_PASSWORD=<password> ke .env\n");
    process.exit(1);
  }

  // ── [2] Audit database ────────────────────────────────────────
  const snap = await getDbSnapshot();

  // ── [3] BLOKIR jika ada akun real ─────────────────────────────
  if (snap.realUsers > 0) {
    console.error("  ┌──────────────────────────────────────────────────────┐");
    console.error("  │  ❌  SEED DIBLOKIR — DATABASE BERISI AKUN PENGGUNA  │");
    console.error("  └──────────────────────────────────────────────────────┘\n");

    console.error(`  Terdeteksi ${snap.realUsers} akun pengguna nyata di database:`);
    snap.realSamples.forEach((u) => {
      console.error(`    →  ${(u.name ?? "Tanpa nama").padEnd(25)}  ${u.email}`);
    });
    if (snap.realUsers > 5) {
      console.error(`    →  ... dan ${snap.realUsers - 5} akun lainnya`);
    }

    console.error("\n  ┌─ ⚠  PERINGATAN KERAS ────────────────────────────────┐");
    console.error("  │                                                       │");
    console.error("  │  Menjalankan seed akan MENGHAPUS SEMUA DATA di bawah │");
    console.error("  │  ini secara PERMANEN — TIDAK BISA DIKEMBALIKAN:      │");
    console.error("  │                                                       │");
    console.error(`  │    •  ${String(snap.realUsers).padEnd(5)} akun pengguna nyata                    │`);
    console.error(`  │    •  ${String(snap.totalUsers).padEnd(5)} total akun (real + dummy)             │`);
    console.error(`  │    •  ${String(snap.logbooks).padEnd(5)} riwayat logbook                       │`);
    console.error(`  │    •  ${String(snap.evaluations).padEnd(5)} data evaluasi                        │`);
    console.error(`  │    •  ${String(snap.certificates).padEnd(5)} sertifikat yang sudah diterbitkan   │`);
    console.error(`  │    •  ${String(snap.applications).padEnd(5)} pendaftaran program magang          │`);
    console.error(`  │    •  ${String(snap.programs).padEnd(5)} program magang                       │`);
    console.error("  │                                                       │");
    console.error("  │  Seed TIDAK DIIZINKAN selama ada data pengguna nyata.│");
    console.error("  │  Hubungi administrator untuk melakukan reset manual.  │");
    console.error("  └───────────────────────────────────────────────────────┘\n");
    process.exit(1);
  }

  // ── [4] Tidak ada akun real — lanjutkan ───────────────────────
  if (snap.totalUsers > 0) {
    console.log("  ℹ  Database berisi data dummy dari seed sebelumnya.");
    console.log("     Data lama (dummy) akan dihapus dan diisi ulang.\n");
  } else {
    console.log("  ✓  Database kosong. Siap untuk seed.\n");
  }

  // ── [5] Hapus data lama (dummy only — akun real sudah diblokir)
  console.log("  Menghapus data lama...");
  await prisma.certificate.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.mentorIntern.deleteMany();
  await prisma.logbook.deleteMany();
  await prisma.application.deleteMany();
  await prisma.internshipProgram.deleteMany();
  await prisma.user.deleteMany();
  console.log("  ✓  Data lama dihapus.\n");

  // ── [6] Isi data seed baru ─────────────────────────────────────
  const hashedPassword = bcrypt.hashSync(seedPassword, 12);

  // Users
  console.log("  Seeding users...");
  await prisma.user.create({
    data: { name: "Admin Lexa", email: "admin@lexa.com", role: "ADMIN", password: hashedPassword },
  });
  const mentor = await prisma.user.create({
    data: { name: "Budi Santoso", email: "mentor@lexa.com", role: "MENTOR", password: hashedPassword },
  });
  const intern1 = await prisma.user.create({
    data: { name: "Rangga Pratama", email: "rangga@lexa.com", role: "INTERN", password: hashedPassword },
  });
  const intern2 = await prisma.user.create({
    data: { name: "Salsabila Putri", email: "salsabila@lexa.com", role: "INTERN", password: hashedPassword },
  });
  const intern3 = await prisma.user.create({
    data: { name: "Muhammad Ilham", email: "ilham@lexa.com", role: "INTERN", password: hashedPassword },
  });
  const intern4 = await prisma.user.create({
    data: { name: "Nadia Azzahra", email: "nadia@lexa.com", role: "INTERN", password: hashedPassword },
  });
  const genericInterns = [];
  for (let i = 1; i <= 20; i++) {
    const user = await prisma.user.create({
      data: {
        name: `Intern Dummy ${i}`,
        email: `intern.dummy${i}@lexa.com`,
        role: "INTERN",
        password: hashedPassword,
      },
    });
    genericInterns.push(user);
  }
  console.log("  ✓  Users seeded.\n");

  // Programs
  console.log("  Seeding programs...");
  const program1 = await prisma.internshipProgram.create({
    data: {
      title: "Frontend Web Developer (Next.js)",
      description: "Learn and build production-grade web applications using React and Next.js.",
      status: "published",
      period: "July - Dec 2026",
    },
  });
  const program2 = await prisma.internshipProgram.create({
    data: {
      title: "UI/UX Product Designer",
      description: "Design elegant interfaces and build interactive prototypes using Figma.",
      status: "published",
      period: "July - Dec 2026",
    },
  });
  const program3 = await prisma.internshipProgram.create({
    data: {
      title: "Backend Engineer (Node.js & Go)",
      description: "Design robust APIs, microservices, and configure relational databases.",
      status: "published",
      period: "July - Dec 2026",
    },
  });
  console.log("  ✓  Programs seeded.\n");

  // Mentor assignments
  console.log("  Seeding mentor assignments...");
  const activeInterns = [intern1, intern2, intern3, intern4];
  for (const intern of activeInterns) {
    await prisma.mentorIntern.create({ data: { mentorId: mentor.id, internId: intern.id } });
  }
  console.log("  ✓  Mentor assignments seeded.\n");

  // Applications
  console.log("  Seeding applications...");
  for (const intern of activeInterns) {
    await prisma.application.create({
      data: { userId: intern.id, programId: program1.id, status: "ACCEPTED", notes: "Approved after technical interview." },
    });
  }
  for (const intern of genericInterns) {
    await prisma.application.create({
      data: { userId: intern.id, programId: program2.id, status: "ACCEPTED" },
    });
  }
  const tempUserData = Array.from({ length: 101 }, (_, i) => ({
    name: `Applicant ${i + 1}`,
    email: `applicant${i + 1}@example.com`,
    role: "INTERN" as const,
    password: hashedPassword,
  }));
  await prisma.user.createMany({ data: tempUserData });
  const tempUsers = await prisma.user.findMany({
    where: { email: { startsWith: "applicant" } },
    select: { id: true },
    orderBy: { email: "asc" },
  });
  await prisma.application.createMany({
    data: tempUsers.map((u, i) => ({
      userId: u.id,
      programId: i % 2 === 0 ? program2.id : program3.id,
      status: (i % 5 === 0 ? "PENDING" : i % 7 === 0 ? "REJECTED" : "ACCEPTED") as
        "PENDING" | "REJECTED" | "ACCEPTED",
    })),
  });
  console.log("  ✓  Applications seeded.\n");

  // Logbooks
  console.log("  Seeding logbooks...");
  const activities = [
    { intern: intern1, progress: 85, activity: "Slicing Figma designs to Next.js components using Tailwind CSS." },
    { intern: intern2, progress: 60, activity: "Creating visual system and component library in Figma." },
    { intern: intern3, progress: 45, activity: "Setting up database schemas and running initial Prisma migrations." },
    { intern: intern4, progress: 30, activity: "Conducting user research and creating wireframes for landing page." },
  ];
  for (const act of activities) {
    await prisma.logbook.create({
      data: {
        userId: act.intern.id,
        activity: act.activity,
        progress: act.progress,
        status: "approved",
        feedback: "Great work! Keep up the quality.",
      },
    });
  }
  console.log("  ✓  Logbooks seeded.\n");

  // Evaluations & certificates
  console.log("  Seeding evaluations & certificates...");
  for (let i = 0; i < 18; i++) {
    const certifiedIntern = genericInterns[i];
    await prisma.evaluation.create({
      data: {
        internId: certifiedIntern.id,
        mentorId: mentor.id,
        technicalScore: 85 + (i % 15),
        attitudeScore: 90,
        communicationScore: 88,
        attendanceScore: 95,
        finalScore: 89.5,
        notes: "Excellent performance throughout the internship.",
      },
    });
    await prisma.certificate.create({
      data: { userId: certifiedIntern.id, certNumber: `CERT-2026-${1000 + i}` },
    });
  }
  console.log("  ✓  Evaluations & certificates seeded.\n");

  console.log("╔══════════════════════════════════════════╗");
  console.log("║   ✓  Database seeded successfully!       ║");
  console.log("╚══════════════════════════════════════════╝\n");
}

main()
  .catch((e) => {
    console.error("\n  ❌  Seed gagal:", e.message ?? e, "\n");
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
