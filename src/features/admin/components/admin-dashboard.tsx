"use client";

import { useEffect, useState } from "react";
import { getDashboardStats } from "../services/dashboard.actions";
import {
  Users, UserPlus, Award, ArrowRight,
  AlertCircle, Clock, FileText, UserCheck,
  Calendar, Square, FilePlus, BarChart3, Link2
} from "lucide-react";
import Link from "next/link";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
} from "recharts";
import { InternsOverviewChart } from "./interns-overview-chart";

/* ─── Types ─────────────────────────────────────── */
interface Application {
  id: string;
  status: string;
  createdAt: Date;
  cvUrl: string | null;
  user: { id: string; name: string | null; email: string };
  program: { title: string };
}
interface ChartPoint { date: string; onGoing: number; completed: number; }
interface PiePoint { name: string; value: number; }
interface DashboardData {
  totalApplicants: number;
  totalInterns: number;
  activeInterns: number;
  completedInterns: number;
  totalCertificates: number;
  pendingApprovals: number;
  totalMentors: number;
  pendingLogbooks: number;
  internsWithoutMentor: number;
  internsNotEvaluated: number;
  latestApplications: Application[];
  internChartData: ChartPoint[];
  programPieData: PiePoint[];
  upcomingSchedule: {
    id: string;
    title: string;
    audience: string;
    eventDate: Date | null;
    eventTime: string | null;
    meetLink: string | null;
  }[];
}

/* ─── Helpers ─────────────────────────────────── */
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  approved: { label: "Accepted", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  pending:  { label: "Pending",  className: "bg-amber-100 text-amber-700" },
};
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "bg-slate-100 text-slate-600" };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.className}`}>{cfg.label}</span>;
}
function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/* ─── Stat Card ──────────────────────────────── */
interface StatCardProps { label: string; value: number; icon: React.ReactNode; iconBg: string; href: string; }
function StatCard({ label, value, icon, iconBg, href }: Readonly<StatCardProps>) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-slate-500 leading-tight whitespace-nowrap">{label}</p>
        <p className="text-lg font-extrabold text-slate-800 leading-tight">{value}</p>
      </div>
    </Link>
  );
}

/* ─── Main Component ─────────────────────────── */
export function AdminDashboard({ initialData }: Readonly<{ initialData: DashboardData }>) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      getDashboardStats().then((r) => {
        if ("error" in r && r.error) setError(r.error);
        else if ("data" in r && r.data) setData(r.data as DashboardData);
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  const stats: StatCardProps[] = [
    { label: "Total Interns",    value: data.completedInterns + data.activeInterns, icon: <Users className="h-4 w-4 text-white" />,    iconBg: "bg-blue-500",   href: "/admin/interns" },
    { label: "Active Programs",  value: data.programPieData.find((p) => p.name === "On Going")?.value ?? 0, icon: <FileText className="h-4 w-4 text-white" />,   iconBg: "bg-indigo-800", href: "/admin/internship-programs" },
    { label: "On Going Interns", value: data.activeInterns,    icon: <UserCheck className="h-4 w-4 text-white" />, iconBg: "bg-green-600",  href: "/admin/interns" },
    { label: "Completed",        value: data.completedInterns, icon: <Award className="h-4 w-4 text-white" />,     iconBg: "bg-purple-500", href: "/admin/interns" },
  ];

  const activePrograms = data.programPieData.find((p) => p.name === "On Going")?.value ?? 0;
  const pieData = [
    { name: "On Going",  value: data.activeInterns,    color: "#3b82f6" },
    { name: "Completed", value: data.completedInterns, color: "#10b981" },
  ].filter((d) => d.value > 0);
  const pieTotal = pieData.reduce((s, p) => s + p.value, 0);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-extrabold text-slate-800 tracking-tight">Welcome back, Admin LEXA!</h1>
          <p className="text-xs text-slate-500">Here&apos;s what&apos;s happening with your internship programs today.</p>
        </div>
        <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          {dateStr}
        </span>
      </div>

      {/* ── Main 2-column: LEFT content + RIGHT side panel ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-3 items-start">

        {/* ── LEFT ── */}
        <div className="space-y-3 min-w-0">

          {/* Stat Cards — 4 card mengisi penuh lebar kolom kiri */}
          <div className="grid grid-cols-4 gap-2">
            {stats.map((s) => <StatCard key={s.label} {...s} />)}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

            {/* Interns Overview — interactive chart with time-range filter */}
            <InternsOverviewChart />

            {/* Pie Chart */}
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col">
              <h2 className="text-sm font-bold text-slate-800 mb-2">Program Status</h2>
              {pieTotal === 0 ? (
                <div className="flex flex-1 items-center justify-center text-xs text-slate-400">No data</div>
              ) : (
                <>
                  <div className="relative flex items-center justify-center" style={{ height: 140 }}>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                          {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(value, name) => [value, name]} contentStyle={{ borderRadius: "8px", border: "1px solid #f1f5f9", fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-extrabold text-slate-800 leading-none">{activePrograms}</span>
                      <span className="text-[9px] font-semibold tracking-widest text-slate-400">Programs</span>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {pieData.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: entry.color }} />
                          <span className="text-[11px] font-medium text-slate-600">{entry.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800">{entry.value}</span>
                          <span className="text-[10px] text-slate-400">{Math.round((entry.value / pieTotal) * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Recent Applications */}
          <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Recent Applications</h2>
                <p className="text-[10px] text-slate-400">Latest 5 applications</p>
              </div>
              <Link href="/admin/applicants" className="flex items-center gap-0.5 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition">
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {data.latestApplications.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-slate-400">No applications yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-50 bg-slate-50/60">
                      {["Name", "Program", "Applied Date", "Status", "Action"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.latestApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {app.user.name?.[0]?.toUpperCase() ?? "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate max-w-[100px]">{app.user.name ?? "—"}</p>
                              <p className="text-[10px] text-slate-400 truncate max-w-[100px]">{app.user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2"><p className="font-medium text-slate-700 truncate max-w-[130px]">{app.program.title}</p></td>
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{formatDate(app.createdAt)}</td>
                        <td className="px-3 py-2"><StatusBadge status={app.status} /></td>
                        <td className="px-3 py-2">
                          <Link href="/admin/applicants" className="inline-flex items-center rounded-md border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 transition">Review</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        {/* ── END LEFT ── */}

        {/* ── RIGHT side panel ── */}
        <div className="flex flex-col gap-3">

          {/* Upcoming Schedule */}
          <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-sm font-bold text-slate-800">Upcoming Schedule</h2>
              <Link href="/admin/announcements" className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 transition">View Calendar</Link>
            </div>
            {data.upcomingSchedule.length === 0 ? (
              <div className="py-4 text-center text-[11px] text-slate-400">No upcoming events.</div>
            ) : (
              <div className="space-y-2.5">
                {data.upcomingSchedule.map((ev) => {
                  const d = ev.eventDate ? new Date(ev.eventDate) : null;
                  const day   = d ? d.getDate().toString().padStart(2, "0") : "—";
                  const month = d ? d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase() : "";
                  const isOnline = !!ev.meetLink;
                  return (
                    <div key={ev.id} className="flex items-start gap-2.5">
                      <div className="flex flex-col items-center justify-center shrink-0 w-8">
                        <span className="text-sm font-extrabold text-slate-800 leading-none">{day}</span>
                        <span className="text-[9px] font-bold text-blue-600 uppercase">{month}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-slate-800 leading-tight truncate">{ev.title}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{ev.audience === "all" ? "All Participants" : ev.audience}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {ev.eventTime && (
                            <>
                              <Clock className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                              <span className="text-[9px] text-slate-400">{ev.eventTime}</span>
                            </>
                          )}
                          {isOnline && (
                            <a href={ev.meetLink!} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-0.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[8px] font-bold text-blue-600 hover:bg-blue-200 transition">
                              <Link2 className="h-2 w-2" />
                              {ev.meetLink!.includes("discord") ? "Discord" : "Online"}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tasks & To Do */}
          <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-sm font-bold text-slate-800">Tasks & To Do</h2>
              <Link href="/admin/monitoring" className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 transition">View All</Link>
            </div>
            {(() => {
              const tasks = [
                { task: "Approve pending registrations", count: data.pendingApprovals,      href: "/admin/reports"    },
                { task: "Review pending logbooks",       count: data.pendingLogbooks,       href: "/admin/monitoring" },
                { task: "Assign mentor to interns",      count: data.internsWithoutMentor,  href: "/admin/interns"    },
                { task: "Interns not yet evaluated",     count: data.internsNotEvaluated,   href: "/admin/interns"    },
              ].filter((t) => t.count > 0);

              if (tasks.length === 0) {
                return (
                  <div className="flex items-center gap-2 py-1.5">
                    <span className="text-emerald-500">✓</span>
                    <span className="text-[11px] text-emerald-600 font-semibold">All caught up! Nothing pending.</span>
                  </div>
                );
              }

              return (
                <div className="space-y-1.5">
                  {tasks.map((t) => (
                    <Link
                      key={t.task}
                      href={t.href}
                      className="flex items-center gap-2 rounded-lg hover:bg-slate-50 px-1.5 py-1.5 -mx-1.5 transition group"
                    >
                      <Square className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-blue-400 transition" />
                      <span className="flex-1 text-[11px] text-slate-600 leading-tight min-w-0 group-hover:text-blue-600 transition">{t.task}</span>
                      <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 shrink-0 group-hover:bg-blue-200 transition">
                        {t.count}
                      </span>
                    </Link>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Quick Links — 4 horizontal */}
          {/* Quick Links — 4 icon horizontal tanpa card */}
          <div className="rounded-xl border border-slate-100 bg-white px-3 py-3 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-2.5">Quick Links</h2>
            <div className="flex items-start justify-between gap-1">
              {[
                { label: "Add Intern",      href: "/admin/reports",             icon: <UserPlus className="h-4 w-4 text-blue-500" />,    bg: "bg-blue-100"    },
                { label: "Create Program",  href: "/admin/internship-programs", icon: <FilePlus className="h-4 w-4 text-indigo-500" />,  bg: "bg-indigo-100"  },
                { label: "Add Mentor",      href: "/admin/mentors",             icon: <UserCheck className="h-4 w-4 text-emerald-500" />,bg: "bg-emerald-100" },
                { label: "Generate Report", href: "/admin/monitoring",          icon: <BarChart3 className="h-4 w-4 text-amber-500" />,  bg: "bg-amber-100"   },
              ].map((ql) => (
                <Link key={ql.label} href={ql.href} className="flex flex-col items-center gap-1.5 flex-1 text-center hover:opacity-80 transition">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${ql.bg}`}>{ql.icon}</div>
                  <span className="text-[9px] font-semibold text-slate-500 leading-tight">{ql.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Help Card */}
          <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)" }}>
            <div className="flex items-end justify-between px-3 pt-3 pb-0 gap-1">
              {/* Text + Button */}
              <div className="pb-3 flex-1 min-w-0">
                <p className="text-[11px] font-bold text-slate-800 leading-tight">Need help?</p>
                <p className="text-[10px] text-slate-500 mt-0.5 mb-2 leading-relaxed">
                  Check our documentation or<br />contact support team.
                </p>
                <Link
                  href="/admin/settings"
                  className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[10px] font-bold text-blue-600 shadow-sm hover:bg-blue-50 transition"
                >
                  Go to Help Center <ArrowRight className="h-2.5 w-2.5" />
                </Link>
              </div>
              {/* Ilustrasi */}
              <div className="shrink-0 self-end">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/help-illustration.png"
                  alt="Help"
                  className="h-16 w-auto object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            </div>
          </div>

        </div>
        {/* ── END RIGHT ── */}

      </div>

      {/* Footer */}
      <p className="text-center text-[11px] pt-2" style={{ color: "#94A3B8" }}>
        © 2026 LEXA Software House. All rights reserved.
      </p>

    </div>
  );
}
