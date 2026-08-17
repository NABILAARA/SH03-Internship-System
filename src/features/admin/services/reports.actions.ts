"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function getReportsData() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return { error: "Unauthorized" };
    }

    // ── Summary counts ──────────────────────────────────────────────────────
    // totalInterns = ongoing + upcoming + completed
    // Konsisten dengan halaman Interns (hanya intern dengan application ACCEPTED)
    const [internCompleted, internOngoing, internUpcoming] = await Promise.all([
      prisma.user.count({
        where: { role: "INTERN", approvalStatus: "APPROVED", certificate: { isNot: null } }
      }),
      prisma.user.count({
        where: {
          role: "INTERN", approvalStatus: "APPROVED",
          applications: { some: { status: "ACCEPTED" } },
          certificate: null,
          internRelation: { isNot: null },
        }
      }),
      prisma.user.count({
        where: {
          role: "INTERN", approvalStatus: "APPROVED",
          applications: { some: { status: "ACCEPTED" } },
          certificate: null,
          internRelation: null,
        }
      }),
    ]);
    const totalInterns = internOngoing + internUpcoming + internCompleted;
    const totalCertificates = await prisma.certificate.count();
    const totalLogbooks     = await prisma.logbook.count();
    const totalMentors      = await prisma.user.count({ where: { role: "MENTOR", approvalStatus: "APPROVED" } });

    // Completion rate = intern dengan sertifikat / total intern
    const completionRate = totalInterns > 0
      ? Math.round((totalCertificates / totalInterns) * 100)
      : 0;

    // ── Distribusi status intern (reuse dari summary) ────────────────────────
    const completed = internCompleted;
    const ongoing   = internOngoing;
    const upcoming  = internUpcoming;

    // ── Ringkasan per program ────────────────────────────────────────────────
    const programs = await prisma.internshipProgram.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        period: true,
        status: true,
        applications: {
          select: { status: true },
        },
      },
    });

    const programSummary = programs.map(p => {
      const accepted = p.applications.filter(a => a.status === "ACCEPTED").length;
      const rejected = p.applications.filter(a => ["REJECTED", "WITHDRAWN"].includes(a.status)).length;
      const pending  = p.applications.filter(a => a.status === "PENDING").length;
      const inReview = p.applications.filter(a => ["IN_REVIEW", "INTERVIEW"].includes(a.status)).length;
      // totalApplicants = pending + accepted + rejected (konsisten dengan card Total Applications di halaman Applicants)
      // IN_REVIEW dan INTERVIEW tidak dimasukkan karena halaman Applicants juga tidak menghitungnya di total
      const totalApplicants = pending + accepted + rejected;
      return {
        id: p.id,
        title: p.title,
        period: p.period,
        status: p.status,
        totalApplicants,
        accepted,
        rejected,
        pending,
        inReview,
      };
    });

    // ── Ringkasan logbook ────────────────────────────────────────────────────
    const logbookApproved = await prisma.logbook.count({ where: { status: "approved" } });
    const logbookPending  = await prisma.logbook.count({ where: { status: "pending" } });
    const logbookRejected = await prisma.logbook.count({ where: { status: "rejected" } });

    // Rata-rata projectProgress dari logbook terbaru tiap intern
    const latestProgressPerIntern = await prisma.logbook.findMany({
      where: { status: "approved" },
      orderBy: { date: "desc" },
      distinct: ["userId"],
      select: { projectProgress: true },
    });
    const avgProjectProgress = latestProgressPerIntern.length > 0
      ? Math.round(
          latestProgressPerIntern.reduce((s, l) => s + l.projectProgress, 0) /
          latestProgressPerIntern.length
        )
      : 0;

    // ── Mentor aktif & jumlah intern yang dibimbing ──────────────────────────
    const mentorList = await prisma.user.findMany({
      where: { role: "MENTOR", approvalStatus: "APPROVED" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        mentorRelations: {
          select: {
            intern: {
              select: {
                id: true,
                name: true,
                internshipPosition: true,
                certificate: { select: { id: true } },
              },
            },
          },
        },
      },
    });

    const mentorData = mentorList.map(m => ({
      id: m.id,
      name: m.name ?? "—",
      email: m.email,
      totalInterns: m.mentorRelations.length,
      activeInterns: m.mentorRelations.filter(r => !r.intern.certificate).length,
      completedInterns: m.mentorRelations.filter(r => !!r.intern.certificate).length,
    }));

    // ── Sertifikat diterbitkan ───────────────────────────────────────────────
    const certificates = await prisma.certificate.findMany({
      orderBy: { issuedAt: "desc" },
      select: {
        id: true,
        certNumber: true,
        issuedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            internshipPosition: true,
            applications: {
              where: { status: "ACCEPTED" },
              select: { program: { select: { title: true } } },
              take: 1,
            },
          },
        },
      },
    });

    const certificateList = certificates.map(c => ({
      id: c.id,
      certNumber: c.certNumber,
      issuedAt: c.issuedAt,
      internName: c.user.name ?? "—",
      internEmail: c.user.email,
      position: c.user.internshipPosition ?? "—",
      programTitle: c.user.applications[0]?.program.title ?? "—",
    }));

    // ── Registration Approval data (existing) ───────────────────────────────
    const pendingRegistrations = await prisma.user.findMany({
      where: { approvalStatus: "PENDING", role: { in: ["INTERN", "MENTOR"] } },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    const registrationHistory = await prisma.user.findMany({
      where: {
        approvalStatus: { in: ["APPROVED", "REJECTED"] },
        role: { in: ["INTERN", "MENTOR"] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, role: true,
        approvalStatus: true, approvedAt: true, rejectedAt: true,
        approvalReason: true, createdAt: true,
      },
    });

    return {
      data: {
        summary: {
          totalInterns,
          totalCertificates,
          totalLogbooks,
          totalMentors,
          completionRate,
        },
        internStatus: { ongoing, upcoming, completed },
        programSummary,
        logbookSummary: {
          total: totalLogbooks,
          approved: logbookApproved,
          pending: logbookPending,
          rejected: logbookRejected,
          avgProjectProgress,
        },
        certificateList,
        mentorData,
        pendingRegistrations,
        registrationHistory,
      },
    };
  } catch (error) {
    console.error("Error fetching reports data:", error);
    return { error: "Gagal mengambil data laporan." };
  }
}
