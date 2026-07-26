import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning database...");
  await prisma.certificate.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.mentorIntern.deleteMany();
  await prisma.logbook.deleteMany();
  await prisma.application.deleteMany();
  await prisma.internshipProgram.deleteMany();
  await prisma.user.deleteMany();

  console.log("Seeding users...");

  // Password seed dibaca dari env agar tidak hardcoded di repo.
  // Set SEED_DEFAULT_PASSWORD di .env — wajib diisi, tidak ada fallback.
  const seedPassword = process.env.SEED_DEFAULT_PASSWORD;
  if (!seedPassword) {
    console.error(
      "ERROR: SEED_DEFAULT_PASSWORD tidak di-set di .env.\n" +
      "Tambahkan SEED_DEFAULT_PASSWORD ke file .env sebelum menjalankan seed."
    );
    process.exit(1);
  }
  const hashedPassword = bcrypt.hashSync(seedPassword, 12);

  await prisma.user.create({
    data: {
      name: "Admin Lexa",
      email: "admin@lexa.com",
      role: "ADMIN",
      password: hashedPassword
    }
  });

  const mentor = await prisma.user.create({
    data: {
      name: "Budi Santoso",
      email: "mentor@lexa.com",
      role: "MENTOR",
      password: hashedPassword
    }
  });

  const intern1 = await prisma.user.create({
    data: {
      name: "Rangga Pratama",
      email: "rangga@lexa.com",
      role: "INTERN",
      password: hashedPassword
    }
  });

  const intern2 = await prisma.user.create({
    data: {
      name: "Salsabila Putri",
      email: "salsabila@lexa.com",
      role: "INTERN",
      password: hashedPassword
    }
  });

  const intern3 = await prisma.user.create({
    data: {
      name: "Muhammad Ilham",
      email: "ilham@lexa.com",
      role: "INTERN",
      password: hashedPassword
    }
  });

  const intern4 = await prisma.user.create({
    data: {
      name: "Nadia Azzahra",
      email: "nadia@lexa.com",
      role: "INTERN",
      password: hashedPassword
    }
  });

  // Seed 14 other completed/approved/pending interns to bump the stats
  const genericInterns = [];
  for (let i = 1; i <= 20; i++) {
    const user = await prisma.user.create({
      data: {
        name: `Intern Dummy ${i}`,
        email: `intern.dummy${i}@lexa.com`,
        role: "INTERN",
        password: hashedPassword
      }
    });
    genericInterns.push(user);
  }

  console.log("Seeding programs...");
  const program1 = await prisma.internshipProgram.create({
    data: {
      title: "Frontend Web Developer (Next.js)",
      description: "Learn and build production-grade web applications using React and Next.js.",
      status: "published",
      period: "July - Dec 2026"
    }
  });

  const program2 = await prisma.internshipProgram.create({
    data: {
      title: "UI/UX Product Designer",
      description: "Design elegant interfaces and build interactive prototypes using Figma.",
      status: "published",
      period: "July - Dec 2026"
    }
  });

  const program3 = await prisma.internshipProgram.create({
    data: {
      title: "Backend Engineer (Node.js & Go)",
      description: "Design robust APIs, microservices, and configure relational databases.",
      status: "published",
      period: "July - Dec 2026"
    }
  });

  console.log("Seeding mentor assignments...");
  const activeInterns = [intern1, intern2, intern3, intern4];
  for (const intern of activeInterns) {
    await prisma.mentorIntern.create({
      data: {
        mentorId: mentor.id,
        internId: intern.id
      }
    });
  }

  console.log("Seeding applications...");
  // Active interns applied and approved
  for (const intern of activeInterns) {
    await prisma.application.create({
      data: {
        userId: intern.id,
        programId: program1.id,
        status: "ACCEPTED",
        notes: "Approved after technical interview."
      }
    });
  }

  // Create 125 total applications (pendaftar)
  // 4 active above + 20 generic + 101 other application rows
  for (const intern of genericInterns) {
    await prisma.application.create({
      data: {
        userId: intern.id,
        programId: program2.id,
        status: "ACCEPTED"
      }
    });
  }

  // Create additional applications to reach 125
  // Batch insert semua tempUser sekaligus — jauh lebih cepat dari 101 sequential creates
  const tempUserData = Array.from({ length: 101 }, (_, i) => ({
    name: `Applicant ${i + 1}`,
    email: `applicant${i + 1}@example.com`,
    role: "INTERN" as const,
    password: hashedPassword,
  }));

  await prisma.user.createMany({ data: tempUserData });

  const tempUsers = await prisma.user.findMany({
    where: { email: { startsWith: "applicant" } },
    select: { id: true, email: true },
    orderBy: { email: "asc" },
  });

  const applicationData = tempUsers.map((tempUser, i) => ({
    userId: tempUser.id,
    programId: i % 2 === 0 ? program2.id : program3.id,
    status: (
      i % 5 === 0 ? "PENDING" : i % 7 === 0 ? "REJECTED" : "ACCEPTED"
    ) as "PENDING" | "REJECTED" | "ACCEPTED",
  }));

  await prisma.application.createMany({ data: applicationData });

  console.log("Seeding logbooks...");
  // Create logbooks for active interns
  const activities = [
    { intern: intern1, progress: 85, activity: "Slicing Figma designs to Next.js components using Tailwind CSS." },
    { intern: intern2, progress: 60, activity: "Creating visual system and component library in Figma." },
    { intern: intern3, progress: 45, activity: "Setting up database schemas and running initial Prisma migrations." },
    { intern: intern4, progress: 30, activity: "Conducting user research and creating wireframes for landing page." }
  ];

  for (const act of activities) {
    await prisma.logbook.create({
      data: {
        userId: act.intern.id,
        activity: act.activity,
        progress: act.progress,
        status: "approved",
        feedback: "Great work! Keep up the quality."
      }
    });
  }

  console.log("Seeding evaluations & certificates...");
  // Create 18 certificates to match "Sertifikat: 18" in mockup
  // Let's take some generic interns and mark them with certificates
  for (let i = 0; i < 18; i++) {
    const certifiedIntern = genericInterns[i];
    
    // Evaluate them first
    await prisma.evaluation.create({
      data: {
        internId: certifiedIntern.id,
        mentorId: mentor.id,
        technicalScore: 85 + (i % 15),
        attitudeScore: 90,
        communicationScore: 88,
        attendanceScore: 95,
        finalScore: 89.5,
        notes: "Excellent performance throughout the internship."
      }
    });

    // Issue certificate
    await prisma.certificate.create({
      data: {
        userId: certifiedIntern.id,
        certNumber: `CERT-2026-${1000 + i}`
      }
    });
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
