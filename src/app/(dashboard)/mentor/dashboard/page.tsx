import { createPageMetadata } from "@/utils/create-page-metadata";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Users2, ClipboardList, CheckCircle2, ArrowRight, Sparkles, Eye, Calendar } from "lucide-react";
import Link from "next/link";

export const metadata = createPageMetadata("Mentor Dashboard");

export default async function MentorDashboardPage() {
  const session = await auth();
  const userName = session?.user?.name ?? "Mentor";
  const userId   = session?.user?.id;

  // Assigned intern IDs
  const assignments = userId
    ? await prisma.mentorIntern.findMany({ where: { mentorId: userId }, select: { internId: true } })
    : [];
  const internIds = assignments.map(a => a.internId);

  // Counts
  const [totalInterns, pendingLogs, reviewedLogs, totalLogs, evaluatedCount] = await Promise.all([
    Promise.resolve(internIds.length),
    internIds.length > 0
      ? prisma.logbook.count({ where: { userId: { in: internIds }, status: "pending" } })
      : Promise.resolve(0),
    internIds.length > 0
      ? prisma.logbook.count({ where: { userId: { in: internIds }, status: { in: ["approved", "rejected"] } } })
      : Promise.resolve(0),
    internIds.length > 0
      ? prisma.logbook.count({ where: { userId: { in: internIds } } })
      : Promise.resolve(0),
    internIds.length > 0
      ? prisma.evaluation.count({ where: { internId: { in: internIds } } })
      : Promise.resolve(0),
  ]);

  // Recent logbooks (latest 8 for "load more" UX simulation)
  const latestLogs = internIds.length > 0
    ? await prisma.logbook.findMany({
        where: { userId: { in: internIds } },
        take: 8,
        orderBy: { date: "desc" },
        include: { user: { select: { name: true, email: true } } },
      })
    : [];

  // Completion rate = evaluated / totalInterns
  const completionRate = totalInterns > 0
    ? Math.round((evaluatedCount / totalInterns) * 100)
    : 0;

  const STATUS_STYLE: Record<string, string> = {
    pending:  "bg-amber-50 text-amber-600 border border-amber-200",
    approved: "bg-emerald-50 text-emerald-600 border border-emerald-200",
    rejected: "bg-rose-50 text-rose-600 border border-rose-200",
  };

  const AVATAR_COLORS = [
    "bg-emerald-500","bg-blue-600","bg-violet-500",
    "bg-orange-500","bg-pink-500","bg-teal-500","bg-rose-500",
  ];

  function avatarColor(name: string) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
  }

  function initials(name: string | null) {
    if (!name) return "??";
    return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* ── Welcome Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-7 text-white shadow-md">
        {/* decorative circles */}
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -right-4 h-28 w-28 rounded-full bg-white/5" />

        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          Hello, {userName}!
        </h1>
        <p className="text-blue-100 text-sm mt-1.5 max-w-lg">
          You have {totalInterns} active intern{totalInterns !== 1 ? "s" : ""} under your supervision.
          Take a moment to review their daily logbooks and provide guidance to keep their progress on track.
        </p>
        <div className="flex flex-wrap gap-3 mt-5">
          <Link
            href="/mentor/assigned-interns"
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            <Eye className="h-4 w-4" />
            View Mentees
          </Link>
          <Link
            href="/mentor/announcements"
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 transition text-white text-sm font-semibold px-4 py-2 rounded-lg border border-white/20"
          >
            <Calendar className="h-4 w-4" />
            Schedule Sync
          </Link>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Active Mentees */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <Users2 className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Mentees</p>
            <p className="text-2xl font-bold text-slate-800 leading-tight">{totalInterns} Interns</p>
          </div>
        </div>

        {/* Pending Logbooks */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50">
            <ClipboardList className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Logbooks</p>
            <p className="text-2xl font-bold text-slate-800 leading-tight">{pendingLogs} Submissions</p>
          </div>
        </div>

        {/* Reviewed Logbooks */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reviewed Logbooks</p>
            <p className="text-2xl font-bold text-slate-800 leading-tight">{reviewedLogs} Approved</p>
          </div>
        </div>
      </div>

      {/* ── Recent Logbooks + Evaluation Menu ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent Logbooks — 2/3 */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800">Recent Logbooks</h2>
              <p className="text-xs text-slate-400 mt-0.5">Review activity reports from your assigned interns</p>
            </div>
            <Link
              href="/mentor/logbook-review"
              className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
            >
              Review All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {latestLogs.length === 0 ? (
            <div className="py-14 text-center text-sm text-slate-400">
              Belum ada laporan dari peserta bimbingan Anda.
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-50">
                {latestLogs.slice(0, 4).map(log => {
                  const name = log.user.name ?? "Tanpa Nama";
                  return (
                    <div key={log.id} className="flex items-start gap-3 px-6 py-3.5 hover:bg-slate-50/50 transition">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold ${avatarColor(name)}`}>
                        {initials(log.user.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
                        <p className="text-xs text-slate-400 truncate">{log.activity}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <p className="text-[10px] text-slate-400">
                          {new Date(log.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS_STYLE[log.status] ?? "bg-slate-100 text-slate-500"}`}>
                          {log.status === "approved" ? "Approved" : log.status === "rejected" ? "Rejected" : "Pending"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalLogs > 4 && (
                <div className="px-6 py-4 border-t border-slate-100 text-center">
                  <Link
                    href="/mentor/logbook-review"
                    className="text-sm font-medium text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-lg px-6 py-2 inline-block transition"
                  >
                    Load More Submissions
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        {/* Evaluation Menu — 1/3 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-5">
          <div>
            <h2 className="text-base font-bold text-slate-800">Evaluation Menu</h2>
            <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
              Once an internship program is completed, you are required to provide a final
              assessment for each intern to release their completion certificate.
            </p>
          </div>

          {/* Completion rate */}
          <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 font-medium">Completion rate</span>
              <span className="font-bold text-blue-600">{completionRate}%</span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          <Link
            href="/mentor/evaluation"
            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-3 rounded-xl transition mt-auto"
          >
            <Sparkles className="h-4 w-4 text-amber-300" />
            Give Final Evaluation
          </Link>
        </div>
      </div>
    </div>
  );
}
