import { createPageMetadata } from "@/utils/create-page-metadata";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  ClipboardList, CheckCircle2, TrendingUp, Award,
  Clock, Folder, ArrowUpRight, Pencil,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";

export const metadata = createPageMetadata("Intern Dashboard");

const AVATAR_COLORS = [
  "bg-emerald-500","bg-blue-600","bg-violet-500",
  "bg-orange-500","bg-pink-500","bg-teal-500",
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name: string | null, email: string) {
  if (!name) return email[0].toUpperCase();
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

export default async function InternDashboardPage() {
  const session  = await auth();
  const userName = session?.user?.name ?? "Intern";
  const userId   = session?.user?.id;

  // All queries in parallel
  const [
    approvedLogs, allProgressLogs,
    application, hasCertificate,
    recentLogs, mentorAssignment, weeklyLogs, totalLogs,
  ] = await Promise.all([
    userId ? prisma.logbook.count({ where: { userId, status: "approved" } }) : Promise.resolve(0),
    userId ? prisma.logbook.findFirst({ where: { userId }, orderBy: { date: "desc" }, select: { projectProgress: true } }) : Promise.resolve(null),
    userId ? prisma.application.findFirst({
      where: { userId, status: "ACCEPTED" },
      include: { program: { select: { title: true, period: true } } },
    }) : Promise.resolve(null),
    userId ? prisma.certificate.findUnique({ where: { userId } }) : Promise.resolve(null),
    userId ? prisma.logbook.findMany({
      where: { userId }, take: 5, orderBy: { date: "desc" },
      select: { id: true, date: true, activity: true, progress: true, projectProgress: true, status: true },
    }) : Promise.resolve([]),
    userId ? prisma.mentorIntern.findUnique({
      where: { internId: userId },
      include: { mentor: { select: { id: true, name: true, email: true } } },
    }) : Promise.resolve(null),
    // weekly = logbook minggu ini
    userId ? prisma.logbook.count({
      where: {
        userId,
        date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }) : Promise.resolve(0),
    // total = semua logbook yang pernah dikirim
    userId ? prisma.logbook.count({ where: { userId } }) : Promise.resolve(0),
  ]);

  // Overall Progress = projectProgress dari logbook terakhir yang dikirim
  const averageProgress = allProgressLogs?.projectProgress ?? 0;

  const STATUS_STYLE: Record<string, string> = {
    approved: "bg-emerald-50 text-emerald-600 border-emerald-200",
    rejected: "bg-rose-50 text-rose-500 border-rose-200",
    pending:  "bg-slate-100 text-slate-500 border-slate-200",
  };
  const STATUS_LABEL: Record<string, string> = {
    approved: "APPROVED",
    rejected: "REJECTED",
    pending:  "PENDING",
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* ── Welcome Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-8 py-8 text-white shadow-md">
        <div className="absolute -top-8 -right-8 h-36 w-36 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 right-12 h-24 w-24 rounded-full bg-white/5" />
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          Hello, {userName}!
        </h1>
        <p className="text-blue-100 text-sm mt-1.5 max-w-lg leading-relaxed">
          {application
            ? `You are enrolled in the "${application.program.title}" program. Don't forget to report your daily activities on time to maintain your progress streak.`
            : "Please register for an active internship program via the Registration menu."}
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Logbooks Sent */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <ClipboardList className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Logbooks Sent</p>
          <p className="text-2xl font-bold text-slate-800 leading-tight mt-0.5">{totalLogs} Report</p>
        </div>

        {/* Logbooks Approved */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Logbooks Approved</p>
          <p className="text-2xl font-bold text-slate-800 leading-tight mt-0.5">{approvedLogs} Report</p>
        </div>

        {/* Average Progress */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
              <TrendingUp className="h-5 w-5 text-violet-500" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">&nbsp;</span>
          </div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Overall Progress</p>
          <p className="text-2xl font-bold text-slate-800 leading-tight mt-0.5">{averageProgress}%</p>
        </div>

        {/* Completion Certificate */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <Award className="h-5 w-5 text-slate-400" />
            </div>
          </div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Completion Certificate</p>
          <p className={`text-sm font-bold mt-0.5 ${hasCertificate ? "text-emerald-600" : "text-slate-400"}`}>
            {hasCertificate ? "Available" : "Not Available"}
          </p>
        </div>
      </div>

      {/* ── Main Content: Feed + Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent Activity Feed — 2/3 */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <h2 className="text-sm font-bold text-slate-800">Recent Activity Feed</h2>
                <p className="text-[11px] text-slate-400">List of your latest daily logbook submissions.</p>
              </div>
            </div>
            <Link
              href="/intern/logbook"
              className="flex items-center gap-0.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
            >
              Fill New <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Log entries */}
          <div className="divide-y divide-slate-50">
            {recentLogs.length === 0 ? (
              <div className="py-14 text-center text-sm text-slate-400">
                Belum ada laporan. Klik &quot;Fill New&quot; untuk memulai.
              </div>
            ) : (
              recentLogs.map(log => (
                <div key={log.id} className="px-6 py-4 hover:bg-slate-50/50 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <p className="text-xs text-slate-400">
                        {new Date(log.date).toLocaleDateString("en-US", {
                          month: "long", day: "numeric", year: "numeric",
                        })}
                      </p>
                      <p className="text-sm font-semibold text-slate-800 line-clamp-2">{log.activity}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        {application && (
                          <span className="flex items-center gap-1">
                            <Folder className="h-3 w-3" />
                            {application.program.title}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {log.projectProgress}% Overall Progress
                        </span>
                      </div>
                    </div>
                    <span className={`shrink-0 self-start text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${STATUS_STYLE[log.status] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
                      {STATUS_LABEL[log.status] ?? log.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Write Report button */}
          <div className="px-6 py-5 border-t border-slate-100">
            <Link
              href="/intern/logbook"
              className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-3 rounded-xl transition"
            >
              <Pencil className="h-4 w-4" />
              Write Report Now
            </Link>
          </div>
        </div>

        {/* Right Sidebar — 1/3 */}
        <div className="flex flex-col gap-4">

          {/* Your Mentor card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your Mentor</p>
            {mentorAssignment ? (
              <>
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white font-bold text-sm ${avatarColor(mentorAssignment.mentor.name ?? mentorAssignment.mentor.email)}`}>
                    {initials(mentorAssignment.mentor.name, mentorAssignment.mentor.email)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {mentorAssignment.mentor.name ?? "—"}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{mentorAssignment.mentor.email}</p>
                  </div>
                </div>
                <button className="w-full rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 py-2 transition">
                  Message
                </button>
              </>
            ) : (
              <p className="text-sm text-slate-400 italic">Belum ada mentor yang ditugaskan.</p>
            )}
          </div>

          {/* Logbook Instructions */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logbook Instructions</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Report your internship activities every working day. Make sure job descriptions
              are written clearly and measurably so that it is easier for mentors to assess your progress.
            </p>
            <ul className="space-y-1.5">
              {[
                "Specify tasks completed today.",
                "List any challenges faced.",
                "Submit by 6:00 PM local time.",
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-xs text-slate-600">
                  <CheckCircle className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
