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


/* ─────────────────────────────────────────────────────────────────────────
   Interns Overview Chart — server-side aggregation
   ─────────────────────────────────────────────────────────────────────────
   Strategy
   ────────
   1. Fetch every ACCEPTED application (per intern) within the requested date
      window, keyed by application.createdAt (= "intern start date").
   2. For each application's owner, resolve the CURRENT status:
        Completed  → user has a certificate
        On Going   → user has an ACCEPTED application AND an assigned mentor
        (Upcoming is excluded — chart only shows On Going + Completed)
   3. Bucket each intern into the appropriate time-period slot, then return
      the list of {date, onGoing, completed} points ready for Recharts.

   Granularity rules
   ─────────────────
   ≤ 31 days   → per day
   > 31 ≤ 180  → per week
   > 180       → per month
*/

export type ChartRangePreset =
  | "7d"
  | "30d"
  | "3m"
  | "6m"
  | "1y"
  | "all"
  | "custom";

export interface ChartRangeInput {
  preset: ChartRangePreset;
  /** ISO strings — only used when preset === "custom" */
  customStart?: string;
  customEnd?: string;
}

export interface InternChartPoint {
  date: string;
  onGoing: number;
  completed: number;
}

export interface InternOverviewChartResult {
  points: InternChartPoint[];
  rangeLabel: string;
}

/** Truncate a Date to midnight WIB (UTC+7) expressed as a UTC Date. */
function toWIBMidnight(d: Date): Date {
  // WIB = UTC+7 → shift to WIB, floor to day, shift back
  const wibMs = d.getTime() + 7 * 60 * 60 * 1000;
  const floored = new Date(Math.floor(wibMs / 86_400_000) * 86_400_000);
  return new Date(floored.getTime() - 7 * 60 * 60 * 1000);
}

/** Start of a given ISO week (Monday) at WIB midnight. */
function weekStart(d: Date): Date {
  const day = d.getUTCDay(); // 0=Sun … 6=Sat
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diff);
  return toWIBMidnight(monday);
}

/** Start of the month that contains `d`, at WIB midnight. */
function monthStart(d: Date): Date {
  // Work in WIB
  const wibMs = d.getTime() + 7 * 60 * 60 * 1000;
  const wibDate = new Date(wibMs);
  const year = wibDate.getUTCFullYear();
  const month = wibDate.getUTCMonth();
  // 1st of that month at 00:00 WIB → UTC
  return new Date(Date.UTC(year, month, 1) - 7 * 60 * 60 * 1000);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}
function addWeeks(d: Date, n: number): Date {
  return addDays(d, n * 7);
}
function addMonths(d: Date, n: number): Date {
  const wibMs = d.getTime() + 7 * 60 * 60 * 1000;
  const wib = new Date(wibMs);
  wib.setUTCMonth(wib.getUTCMonth() + n);
  return new Date(wib.getTime() - 7 * 60 * 60 * 1000);
}

/** Format a bucket-start Date as a readable label. */
function formatBucketLabel(d: Date, granularity: "day" | "week" | "month"): string {
  const opts: Intl.DateTimeFormatOptions = { timeZone: "Asia/Jakarta" };
  if (granularity === "month") {
    opts.month = "short";
    opts.year = "numeric";
  } else if (granularity === "week") {
    opts.day = "numeric";
    opts.month = "short";
  } else {
    opts.day = "numeric";
    opts.month = "short";
  }
  return d.toLocaleDateString("en-GB", opts);
}

export async function getInternsOverviewChartData(
  range: ChartRangeInput
): Promise<{ data?: InternOverviewChartResult; error?: string }> {
  try {
    const { auth } = await import("@/auth");
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return { error: "Unauthorized" };
    }

    const now = new Date();

    /* ── Resolve start / end dates ── */
    let startDate: Date;
    let endDate: Date = toWIBMidnight(addDays(now, 1)); // tomorrow midnight = "through end of today"
    let rangeLabel: string;

    if (range.preset === "custom") {
      if (!range.customStart || !range.customEnd) {
        return { error: "Custom range requires start and end dates." };
      }
      startDate = new Date(range.customStart);
      endDate   = new Date(range.customEnd);
      // push end to end-of-day WIB
      endDate = new Date(toWIBMidnight(addDays(endDate, 1)).getTime() - 1);
      rangeLabel = `${new Date(range.customStart).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} – ${new Date(range.customEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
    } else if (range.preset === "all") {
      // Use the earliest application date as the start
      const earliest = await prisma.application.findFirst({
        where: { status: "ACCEPTED" },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });
      startDate = earliest?.createdAt
        ? toWIBMidnight(earliest.createdAt)
        : toWIBMidnight(addDays(now, -365));
      rangeLabel = "All Time";
    } else {
      const days: Record<Exclude<ChartRangePreset, "custom" | "all">, number> = {
        "7d":  7,
        "30d": 30,
        "3m":  90,
        "6m":  180,
        "1y":  365,
      };
      const d = days[range.preset as keyof typeof days];
      startDate  = toWIBMidnight(addDays(now, -d));
      const labels: Record<string, string> = {
        "7d": "Last 7 Days", "30d": "Last 30 Days",
        "3m": "Last 3 Months", "6m": "Last 6 Months", "1y": "Last 1 Year",
      };
      rangeLabel = labels[range.preset] ?? range.preset;
    }

    /* ── Granularity ── */
    const diffMs   = endDate.getTime() - startDate.getTime();
    const diffDays = diffMs / 86_400_000;
    const granularity: "day" | "week" | "month" =
      diffDays <= 31 ? "day" : diffDays <= 180 ? "week" : "month";

    /* ── Fetch interns whose application.createdAt falls in [startDate, endDate] ── */
    // One query — fetch the application + enough user data to resolve status
    const applications = await prisma.application.findMany({
      where: {
        status: "ACCEPTED",
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        createdAt: true,
        user: {
          select: {
            certificate:    { select: { id: true } },
            internRelation: { select: { id: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (applications.length === 0) {
      return { data: { points: [], rangeLabel } };
    }

    /* ── Build bucket grid ── */
    type BucketKey = string; // formatted label
    const buckets = new Map<BucketKey, { start: Date; onGoing: number; completed: number }>();

    // Generate every bucket between startDate and endDate
    let cursor =
      granularity === "day"   ? toWIBMidnight(startDate)
      : granularity === "week"  ? weekStart(startDate)
      : monthStart(startDate);

    while (cursor <= endDate) {
      const label = formatBucketLabel(cursor, granularity);
      if (!buckets.has(label)) {
        buckets.set(label, { start: new Date(cursor), onGoing: 0, completed: 0 });
      }
      cursor =
        granularity === "day"   ? addDays(cursor, 1)
        : granularity === "week"  ? addWeeks(cursor, 1)
        : addMonths(cursor, 1);
    }

    /* ── Assign each intern to the correct bucket ── */
    for (const app of applications) {
      // Determine current status
      const isCompleted = !!app.user.certificate;
      const isOnGoing   = !isCompleted && !!app.user.internRelation;
      if (!isCompleted && !isOnGoing) continue; // Upcoming — excluded from chart

      // Find the bucket that contains app.createdAt
      const appDate = app.createdAt;
      let bucketKey: string | undefined;
      let prevKey: string | undefined;

      for (const [key, val] of buckets) {
        if (appDate >= val.start) {
          bucketKey = key;
        } else {
          break;
        }
        void prevKey;
        prevKey = key;
      }

      // Fallback: if appDate is before first bucket (edge case with "all"), use first bucket
      if (!bucketKey) {
        bucketKey = buckets.keys().next().value as string;
      }

      if (bucketKey) {
        const bucket = buckets.get(bucketKey)!;
        if (isCompleted)  bucket.completed++;
        else              bucket.onGoing++;
      }
    }

    /* ── Serialise to array ── */
    const points: InternChartPoint[] = Array.from(buckets.entries()).map(([date, b]) => ({
      date,
      onGoing:   b.onGoing,
      completed: b.completed,
    }));

    return { data: { points, rangeLabel } };
  } catch (error: unknown) {
    console.error("Error fetching interns overview chart data:", error);
    return { error: "Gagal mengambil data grafik" };
  }
}
