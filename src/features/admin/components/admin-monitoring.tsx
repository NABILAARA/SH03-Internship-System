"use client";

import { useState, useMemo } from "react";
import {
  Search, FileText, Clock, CheckCircle2,
  ChevronLeft, ChevronRight, X,
} from "lucide-react";

/* ─── Types ────────────────────────────────────────── */
type MonitoringLogbook = {
  id: string;
  activity: string;
  progress: number;
  projectProgress: number;
  status: string;
  feedback: string | null;
  date: Date;
  user: {
    name: string | null;
    email: string;
    internRelation: {
      mentor: { id: string; name: string | null; email: string };
    } | null;
  };
};

type AdminMonitoringProps = {
  logbooks: MonitoringLogbook[];
};

/* ─── Constants ─────────────────────────────────────── */
const STATUS_STYLE: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

const STATUS_LABEL: Record<string, string> = {
  pending:  "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const PAGE_SIZE = 5;

function formatDate(value: Date) {
  return new Date(value).toLocaleString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ─── Component ─────────────────────────────────────── */
export function AdminMonitoring({ logbooks }: Readonly<AdminMonitoringProps>) {
  const [searchQuery, setSearchQuery]   = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterIntern, setFilterIntern] = useState("all");
  const [filterMentor, setFilterMentor] = useState("all");
  const [currentPage, setCurrentPage]   = useState(1);

  /* Counts */
  const pendingCount  = logbooks.filter(l => l.status === "pending").length;
  const approvedCount = logbooks.filter(l => l.status === "approved").length;
  const rejectedCount = logbooks.filter(l => l.status === "rejected").length;
  const finalCount    = approvedCount + rejectedCount;
  const successRate   = finalCount > 0 ? Math.round((approvedCount / finalCount) * 100) : 0;

  /* Unique interns & mentors for dropdowns */
  const uniqueInterns = useMemo(() =>
    Array.from(new Map(logbooks.map(l => [l.user.email, l.user.name ?? l.user.email])).entries()),
    [logbooks]);

  const uniqueMentors = useMemo(() =>
    Array.from(new Map(
      logbooks
        .filter(l => l.user.internRelation?.mentor)
        .map(l => {
          const m = l.user.internRelation!.mentor;
          return [m.id, m.name ?? m.email] as [string, string];
        })
    ).entries()),
    [logbooks]);

  /* Filtered list */
  const filtered = useMemo(() => {
    return logbooks.filter(log => {
      const matchStatus = filterStatus === "all" || log.status === filterStatus;
      const matchIntern = filterIntern === "all" || log.user.email === filterIntern;
      const matchMentor =
        filterMentor === "all" ||
        log.user.internRelation?.mentor.id === filterMentor ||
        (filterMentor === "unassigned" && !log.user.internRelation);
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        (log.user.name?.toLowerCase().includes(q) ?? false) ||
        log.user.email.toLowerCase().includes(q) ||
        log.activity.toLowerCase().includes(q);
      return matchStatus && matchIntern && matchMentor && matchSearch;
    });
  }, [logbooks, filterStatus, filterIntern, filterMentor, searchQuery]);

  /* Pagination */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const setFilter = (s: string) => { setFilterStatus(s); setCurrentPage(1); };
  const setSearch = (s: string) => { setSearchQuery(s); setCurrentPage(1); };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white/70 p-6 rounded-2xl border border-slate-100 shadow-sm backdrop-blur-md">
        <h1 className="text-2xl font-bold text-slate-800">Monitoring</h1>
        <p className="text-sm text-slate-500 mt-0.5">Monitor daily intern activities and logbooks</p>
      </div>

      {/* Stat Cards — 3 kolom */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Logbook */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Logbook</p>
            <p className="text-3xl font-bold text-slate-800 mt-1 leading-tight">{logbooks.length}</p>
            <p className="text-xs text-emerald-500 font-semibold mt-1.5 flex items-center gap-1">
              +12% from last week
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <FileText className="h-5 w-5 text-blue-500" />
          </div>
        </div>

        {/* Menunggu Review */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Waiting for Review</p>
            <p className="text-3xl font-bold text-amber-500 mt-1 leading-tight">{pendingCount}</p>
            <p className="text-xs text-amber-500 font-semibold mt-1.5 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Urgent attention needed
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50">
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
        </div>

        {/* Status Final */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Status Final</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1 leading-tight">{finalCount}</p>
            <p className="text-xs text-emerald-500 font-semibold mt-1.5 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Success rate: {successRate}%
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="p-5 border-b border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-800">Logbook Magang</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Pantau aktivitas harian dari akun role magang yang sudah mengirim logbook.
              </p>
            </div>
          </div>

          {/* Filter row 1: tabs + search + dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status tabs */}
            {(["all", "pending", "approved", "rejected"] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                  filterStatus === s
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {s === "all" ? "Semua" : s === "pending" ? "Pending" : s === "approved" ? "Disetujui" : "Ditolak"}
              </button>
            ))}

            {/* pushed right */}
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari nama, email, atau aktivitas..."
                  value={searchQuery}
                  onChange={e => setSearch(e.target.value)}
                  className="rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition w-56"
                />
                {searchQuery && (
                  <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Intern dropdown */}
              <select
                value={filterIntern}
                onChange={e => { setFilterIntern(e.target.value); setCurrentPage(1); }}
                className="rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-7 text-xs text-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              >
                <option value="all">Semua Intern</option>
                {uniqueInterns.map(([email, name]) => (
                  <option key={email} value={email}>{name}</option>
                ))}
              </select>

              {/* Mentor dropdown */}
              <select
                value={filterMentor}
                onChange={e => { setFilterMentor(e.target.value); setCurrentPage(1); }}
                className="rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-7 text-xs text-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              >
                <option value="all">Semua Mentor</option>
                <option value="unassigned">Belum ada mentor</option>
                {uniqueMentors.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Count info */}
          {filtered.length > 0 && (
            <p className="text-xs text-slate-400 text-right">
              Menampilkan {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} dari {filtered.length} logbook
            </p>
          )}
        </div>

        {/* Table */}
        {paginated.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            Belum ada logbook yang sesuai filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Intern</th>
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Mentor</th>
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Tanggal</th>
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 w-[130px]">Progress</th>
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 max-w-[220px]">Aktivitas</th>
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 max-w-[180px]">Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginated.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition align-top">
                    {/* Intern */}
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800 text-sm">{log.user.name ?? "Tanpa nama"}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[160px]">{log.user.email}</p>
                    </td>

                    {/* Mentor */}
                    <td className="px-4 py-3.5">
                      {log.user.internRelation?.mentor ? (
                        <>
                          <p className="text-sm font-medium text-slate-700">{log.user.internRelation.mentor.name ?? "—"}</p>
                          <p className="text-xs text-slate-400 truncate max-w-[140px]">{log.user.internRelation.mentor.email}</p>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Belum ditugaskan</span>
                      )}
                    </td>

                    {/* Tanggal */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <p className="text-xs text-slate-600">{formatDate(log.date)}</p>
                    </td>

                    {/* Progress bar — overall project */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-violet-100 rounded-full overflow-hidden min-w-[60px]">
                          <div
                            className="h-full rounded-full bg-violet-500 transition-all duration-500"
                            style={{ width: `${log.projectProgress}%` }}
                          />
                        </div>
                        <span className="text-xs text-violet-600 font-medium w-8 shrink-0">{log.projectProgress}%</span>
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[log.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {STATUS_LABEL[log.status] ?? log.status}
                      </span>
                    </td>

                    {/* Aktivitas */}
                    <td className="px-4 py-3.5 max-w-[220px]">
                      <p className="text-xs text-slate-600 line-clamp-2">{log.activity}</p>
                    </td>

                    {/* Feedback */}
                    <td className="px-4 py-3.5 max-w-[180px]">
                      {log.feedback ? (
                        <p className="text-xs text-emerald-600 font-medium line-clamp-2">{log.feedback}</p>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} logbooks
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let p: number;
                if (totalPages <= 5)                  p = i + 1;
                else if (currentPage <= 3)            p = i + 1;
                else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
                else                                  p = currentPage - 2 + i;
                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition ${
                      p === currentPage
                        ? "bg-blue-600 text-white shadow-sm"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="text-slate-400 text-xs px-1">…</span>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    {totalPages}
                  </button>
                </>
              )}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
