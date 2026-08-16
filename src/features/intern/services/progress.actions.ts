"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function getInternProgressData() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userId = session.user.id;

  const logbooks = await prisma.logbook.findMany({
    where: { userId },
    orderBy: { date: "asc" },
    select: { id: true, date: true, activity: true, progress: true, projectProgress: true, status: true, feedback: true }
  });
  const evaluation = await prisma.evaluation.findUnique({
    where: { internId: userId },
    select: {
      finalScore: true, technicalScore: true, attitudeScore: true,
      communicationScore: true, attendanceScore: true, notes: true
    }
  });
  const application = await prisma.application.findFirst({
    where: { userId, status: "ACCEPTED" },
    include: { program: true }
  });

  const total = logbooks.length;
  const approved = logbooks.filter((l) => l.status === "approved").length;
  const rejected = logbooks.filter((l) => l.status === "rejected").length;
  const pending = logbooks.filter((l) => l.status === "pending").length;
  const avgProgress =
    total > 0 ? Math.round(logbooks.reduce((s, l) => s + l.progress, 0) / total) : 0;
  const latestProjectProgress =
    total > 0 ? logbooks[logbooks.length - 1]!.projectProgress : 0;

  return {
    logbooks,
    evaluation,
    application,
    stats: { total, approved, rejected, pending, avgProgress, latestProjectProgress }
  };
}
