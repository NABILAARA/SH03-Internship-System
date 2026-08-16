"use client";

import { useState } from "react";
import {
  Users, Search, ClipboardList, Sparkles,
  Eye, AlertTriangle, X,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/* ─── Types ─────────────────────────────────────────── */
type Logbook = {
  id: string;
  date: Date;
  activity: string;
  progress: number;
  projectProgress: number;
  status: string;
};

type Evaluation = {
  finalScore: number;
  technicalScore: number;
  attitudeScore: number;
  communicationScore: number;
  attendanceScore: number;
};

type Certificate = {
  certNumber: string;
  issuedAt: Date;
};

type Program = {
  title: string;
  period: string | null;
};

type Application = {
  program: Program;
};

type InternDetail = {
  id: string;
  name: string | null;
  email: string;
  internEvaluation: Evaluation | null;
  certificate: Certificate | null;
  applications: Application[];
  logbooks: Logbook[];
};

type AssignedInternsListProps = {
  interns: InternDetail[];
};

/* ─── Helpers ────────────────────────────────────────── */
const AVATAR_COLORS = [
  "bg-pink-500", "bg-emerald-500", "bg-blue-600",
  "bg-orange-500", "bg-violet-500", "bg-teal-500",
  "bg-rose-500", "bg-indigo-500", "bg-amber-500",
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

function logbookDotColor(status: string) {
  if (status === "approved") return "bg-emerald-500";
  if (status === "rejected") return "bg-red-500";
  return "bg-amber-400";
}

const PAGE_SIZE = 6;

/* ─── Component ─────────────────────────────────────── */
export function AssignedInternsList({ interns }: Readonly<AssignedInternsListProps>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [detailIntern, setDetailIntern] = useState<InternDetail | null>(null);

  const filtered = interns.filter(intern => {
    const q = searchQuery.toLowerCase();
    return (
      (intern.name?.toLowerCase().includes(q) ?? false) ||
      intern.email.toLowerCase().includes(q)
    );
  });

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Assigned Interns</h1>
              <p className="text-sm text-slate-500 mt-0.5 max-w-md">
                Monitor the progress and activities of interns under your guidance.
                Track logbooks, evaluations, and overall performance.
              </p>
            </div>
          </div>
          <span className="shrink-0 inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-bold">
            {interns.length} Interns
          </span>
        </div>
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-2xl border border-slate-100 px-4 py-3 shadow-sm">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter by name or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            maxLength={100}
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-14 text-center">
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          {interns.length === 0 ? (
            <>
              <p className="text-slate-600 font-semibold text-sm">Belum ada peserta magang bimbingan Anda.</p>
              <p className="text-slate-400 text-xs mt-1">Admin akan menugaskan peserta kepada Anda.</p>
            </>
          ) : (
            <p className="text-slate-500 text-sm">Tidak ada peserta yang cocok dengan &quot;{searchQuery}&quot;.</p>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visible.map(intern => {
              const hasGraduated = !!intern.certificate;
              const hasApp       = intern.applications.length > 0;
              const programTitle = intern.applications[0]?.program.title ?? null;
              const color        = avatarColor(intern.name ?? intern.email);
              const ini          = initials(intern.name, intern.email);
              const eval_        = intern.internEvaluation;
              const recentLogs   = intern.logbooks.slice(0, 5);

              return (
                <div
                  key={intern.id}
                  className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition duration-200 flex flex-col"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 px-5 pt-5 pb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white font-bold text-sm ${color}`}>
                        {ini}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-800 text-sm truncate">{intern.name ?? "(Tanpa Nama)"}</h3>
                        <p className="text-xs text-slate-400 truncate">{intern.email}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                      hasGraduated
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}>
                      {hasGraduated ? "Graduated ✓" : "Active"}
                    </span>
                  </div>

                  <div className="px-5 pb-5 flex flex-col gap-4 flex-1">
                    {/* Program */}
                    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Program</p>
                      {hasApp && programTitle ? (
                        <p className="text-sm font-semibold text-slate-700 truncate">{programTitle}</p>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-amber-500">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>Has not registered for a program</span>
                        </div>
                      )}
                    </div>

                    {/* Last 5 Logbooks */}
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Last 5 Logbooks</p>
                      {recentLogs.length === 0 ? (
                        <div className="flex flex-col items-center py-4 text-slate-300">
                          <ClipboardList className="h-7 w-7 mb-1" />
                          <p className="text-xs">No logbooks submitted yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {recentLogs.map(log => (
                            <div key={log.id} className="flex items-center gap-2">
                              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${logbookDotColor(log.status)}`} />
                              <span className="text-[10px] text-slate-500 shrink-0 w-10">
                                {new Date(log.date).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                              </span>
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-violet-500 rounded-full transition-all"
                                  style={{ width: `${log.projectProgress}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-semibold text-violet-600 w-7 text-right shrink-0">
                                {log.projectProgress}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Evaluation or placeholder */}
                    {eval_ ? (
                      <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest">Final Grade</p>
                          <span className="text-xl font-extrabold text-emerald-600">{eval_.finalScore.toFixed(1)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-slate-500">
                          <div className="flex justify-between"><span>Technical:</span><span className="font-bold text-slate-700">{eval_.technicalScore}</span></div>
                          <div className="flex justify-between"><span>Attitude:</span><span className="font-bold text-slate-700">{eval_.attitudeScore}</span></div>
                          <div className="flex justify-between"><span>Comms:</span><span className="font-bold text-slate-700">{eval_.communicationScore}</span></div>
                          <div className="flex justify-between"><span>Attendance:</span><span className="font-bold text-slate-700">{eval_.attendanceScore}</span></div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Belum dievaluasi</p>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-auto pt-1">
                      {hasGraduated ? (
                        <Button
                          onClick={() => setDetailIntern(intern)}
                          variant="outline"
                          size="sm"
                          className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Detailed Report
                        </Button>
                      ) : (
                        <>
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs gap-1.5"
                          >
                            <Link href="/mentor/logbook-review">
                              <Eye className="h-3.5 w-3.5" />
                              Review Logbook
                            </Link>
                          </Button>
                          <Button
                            asChild
                            size="sm"
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs gap-1.5"
                          >
                            <Link href="/mentor/evaluation">
                              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                              Give Grade
                            </Link>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show more */}
          {hasMore && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                className="border-slate-200 text-slate-600 hover:bg-slate-50 font-medium px-8"
              >
                Show more interns
              </Button>
            </div>
          )}
        </>
      )}

      {/* Detail / Report Modal */}
      {detailIntern && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Detailed Report</h3>
              <button onClick={() => setDetailIntern(null)} className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white font-bold text-sm ${avatarColor(detailIntern.name ?? detailIntern.email)}`}>
                  {initials(detailIntern.name, detailIntern.email)}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{detailIntern.name ?? "(Tanpa Nama)"}</p>
                  <p className="text-xs text-slate-400">{detailIntern.email}</p>
                </div>
              </div>

              {detailIntern.internEvaluation && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-emerald-600">Final Grade</p>
                    <span className="text-2xl font-extrabold text-emerald-600">
                      {detailIntern.internEvaluation.finalScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
                    <div className="flex justify-between"><span>Technical</span><span className="font-bold text-slate-700">{detailIntern.internEvaluation.technicalScore}</span></div>
                    <div className="flex justify-between"><span>Attitude</span><span className="font-bold text-slate-700">{detailIntern.internEvaluation.attitudeScore}</span></div>
                    <div className="flex justify-between"><span>Communication</span><span className="font-bold text-slate-700">{detailIntern.internEvaluation.communicationScore}</span></div>
                    <div className="flex justify-between"><span>Attendance</span><span className="font-bold text-slate-700">{detailIntern.internEvaluation.attendanceScore}</span></div>
                  </div>
                </div>
              )}

              {detailIntern.certificate && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-xs text-slate-400 mb-0.5">Certificate Number</p>
                  <p className="text-sm font-semibold text-slate-700">{detailIntern.certificate.certNumber}</p>
                </div>
              )}

              <p className="text-xs text-slate-400">
                Total {detailIntern.logbooks.length} logbook dikirim.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
