"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function getDashboardStats() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return { error: "Unauthorized" };
    }

    const PERIOD_START = new Date("2026-06-20T00:00:00.000Z");
    const PERIOD_END   = new Date("2026-10-20T23:59:59.999Z");

    // Sequential queries — Vercel Supabase pooler connection_limit=1
    const totalApplicants   = await prisma.application.count();
    const totalInterns      = await prisma.user.count({ where: { role: "INTERN", approvalStatus: "APPROVED" } });
    const activeInterns     = await prisma.user.count({
      where: { role: "INTERN", approvalStatus: "APPROVED", applications: { some: { status: "ACCEPTED" } }, certificate: null }
    });
    const completedInterns  = await prisma.user.count({
      where: { role: "INTERN", approvalStatus: "APPROVED", certificate: { isNot: null } }
    });
    const totalCertificates = await prisma.certificate.count();
    const pendingApprovals  = await prisma.user.count({
      where: { approvalStatus: "PENDING", role: { in: ["INTERN", "MENTOR"] } }
    });
    const totalMentors      = await prisma.user.count({ where: { role: "MENTOR", approvalStatus: "APPROVED" } });
    const pendingLogbooks   = await prisma.logbook.count({ where: { status: "pending" } });
    const internsWithoutMentor = await prisma.user.count({
      where: {
        role: "INTERN",
        approvalStatus: "APPROVED",
        applications: { some: { status: "ACCEPTED" } },
        internRelation: null,
      }
    });
    const internsNotEvaluated = await prisma.user.count({
      where: {
        role: "INTERN",
        approvalStatus: "APPROVED",
        applications: { some: { status: "ACCEPTED" } },
        certificate: null,
        internEvaluation: null,
      }
    });

    // Upcoming schedule — ambil 3 announcement dengan eventDate terdekat ke depan
    const upcomingSchedule = await prisma.announcement.findMany({
      where: {
        status: "published",
        eventDate: { gte: new Date() }
      },
      orderBy: { eventDate: "asc" },
      take: 3,
      select: {
        id: true, title: true, audience: true,
        eventDate: true, eventTime: true, meetLink: true
      }
    });
    const latestApplications = await prisma.application.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, status: true, createdAt: true, cvUrl: true,
        user: { select: { id: true, name: true, email: true } },
        program: { select: { title: true } }
      }
    });
    const programStatusCounts = await prisma.internshipProgram.groupBy({
      by: ["status"],
      _count: { _all: true }
    });
    const chartApplications = await prisma.application.findMany({
      where: { status: "ACCEPTED", updatedAt: { gte: PERIOD_START, lte: PERIOD_END } },
      select: { updatedAt: true }
    });
    const chartCertificates = await prisma.certificate.findMany({
      where: { issuedAt: { gte: PERIOD_START, lte: PERIOD_END } },
      select: { issuedAt: true }
    });

    // Build weekly chart data in memory — no DB calls in loop
    const weekStarts: Date[] = [];
    const cursor = new Date(PERIOD_START);
    while (cursor <= PERIOD_END) {
      weekStarts.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }

    const internChartData = weekStarts.map((weekStart) => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      const end = weekEnd > PERIOD_END ? PERIOD_END : weekEnd;

      const onGoing = chartApplications.filter(
        (a) => a.updatedAt >= weekStart && a.updatedAt <= end
      ).length;
      const completed = chartCertificates.filter(
        (c) => c.issuedAt >= weekStart && c.issuedAt <= end
      ).length;

      return {
        date: weekStart.toLocaleDateString("id-ID", {
          day: "numeric", month: "short", timeZone: "Asia/Jakarta"
        }),
        onGoing,
        completed
      };
    });

    const programPieData = programStatusCounts.map((p) => ({
      name: p.status === "published" ? "On Going" : p.status === "closed" ? "Completed" : "Upcoming",
      value: p._count._all
    }));

    return {
      data: {
        totalApplicants,
        totalInterns,
        activeInterns,
        completedInterns,
        totalCertificates,
        pendingApprovals,
        totalMentors,
        pendingLogbooks,
        internsWithoutMentor,
        internsNotEvaluated,
        latestApplications,
        internChartData,
        programPieData,
        upcomingSchedule
      }
    };
  } catch (error: unknown) {
    console.error("Error fetching dashboard stats:", error);
    return { error: "Gagal mengambil data dashboard" };
  }
}
