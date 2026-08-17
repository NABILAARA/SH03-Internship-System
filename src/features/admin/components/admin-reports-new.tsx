"use client";

import { useState, useMemo } from "react";
import {
  Users, Award, ClipboardList,
  TrendingUp, CheckCircle2, XCircle,
  Download, Search, Check, X, Loader2,
  ChevronLeft, ChevronRight, Eye,
} from "lucide-react";
import {
  approveRegistration,
  rejectRegistration,
} from "../services/registration-approval.actions";
import { Button } from "@/components/ui/button";

/* ─── Types ─────────────────────────────────────────── */
interface ProgramSummary {
  id: string;
  title: string;
  period: string | null;
  status: string;
  totalApplicants: number;
  accepted: number;
  rejected: number;
  pending: number;
  inReview: number;
}

interface MentorItem {
  id: string;
  name: string;
  email: string;
  totalInterns: number;
  activeInterns: number;
  completedInterns: number;
}

interface CertificateItem {
  id: string;
  certNumber: string;
  issuedAt: Date;
  internName: string;
  internEmail: string;
  position: string;
  programTitle: string;
}

interface PendingUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: Date;
}

interface HistoryUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  approvalStatus: string;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  approvalReason: string | null;
  createdAt: Date;
}

interface AdminReportsNewProps {
  summary: {
    totalInterns: number;
    totalCertificates: number;
    totalLogbooks: number;
    totalMentors: number;
    completionRate: number;
  };
  internStatus: { ongoing: number; upcoming: number; completed: number };
  programSummary: ProgramSummary[];
  logbookSummary: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    avgProjectProgress: number;
  };
  certificateList: CertificateItem[];
  mentorData: MentorItem[];
  pendingRegistrations: PendingUser[];
  registrationHistory: HistoryUser[];
}

/* ─── Helpers ───────────────────────────────────────── */
const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-orange-500", "bg-pink-500", "bg-teal-500",
  "bg-rose-500", "bg-indigo-500", "bg-amber-500",
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
function formatDate(d: Date | null | string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}
function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  return `${Math.floor(hrs / 24)} hari lalu`;
}

const PAGE_SIZE = 5;

/* ─── Component ─────────────────────────────────────── */
export function AdminReportsNew({
  summary,
  internStatus,
  programSummary,
  logbookSummary,
  certificateList,
  mentorData,
  pendingRegistrations: initialPending,
  registrationHistory,
}: Readonly<AdminReportsNewProps>) {

  // Registration approval state
  const [pending, setPending]           = useState<PendingUser[]>(initialPending);
  const [loadingId, setLoadingId]       = useState<string | null>(null);
  const [rejectForms, setRejectForms]   = useState<Record<string, boolean>>({});
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  // History state
  const [history]                       = useState<HistoryUser[]>(registrationHistory);
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState<"all" | "APPROVED" | "REJECTED">("all");
  const [historyPage, setHistoryPage]   = useState(1);
  const [detailUser, setDetailUser]     = useState<HistoryUser | null>(null);

  // Cert state
  const [certSearch, setCertSearch]     = useState("");
  const [certPage, setCertPage]         = useState(1);

  // ── Handlers ──────────────────────────────────────────
  const handleApprove = async (userId: string) => {
    setLoadingId(userId);
    const res = await approveRegistration(userId);
    if (res.success) setPending(prev => prev.filter(u => u.id !== userId));
    setLoadingId(null);
  };

  const handleReject = async (userId: string) => {
    setLoadingId(userId);
    const res = await rejectRegistration(userId, rejectReasons[userId] ?? "");
    if (res.success) {
      setPending(prev => prev.filter(u => u.id !== userId));
      setRejectForms(prev => ({ ...prev, [userId]: false }));
    }
    setLoadingId(null);
  };

  // ── Filtered history ───────────────────────────────────
  const filteredHistory = useMemo(() => history.filter(u => {
    const matchFilter = historyFilter === "all" || u.approvalStatus === historyFilter;
    const q = historySearch.toLowerCase();
    const matchSearch = !q ||
      (u.name?.toLowerCase().includes(q) ?? false) ||
      u.email.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  }), [history, historySearch, historyFilter]);

  const historyTotalPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
  const historyPaginated  = filteredHistory.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE);
  const approvedCount = history.filter(u => u.approvalStatus === "APPROVED").length;
  const rejectedCount = history.filter(u => u.approvalStatus === "REJECTED").length;

  // ── Filtered certificates ──────────────────────────────
  const filteredCerts = useMemo(() => certificateList.filter(c => {
    const q = certSearch.toLowerCase();
    return !q ||
      c.internName.toLowerCase().includes(q) ||
      c.certNumber.toLowerCase().includes(q) ||
      c.programTitle.toLowerCase().includes(q);
  }), [certificateList, certSearch]);

  const certTotalPages = Math.max(1, Math.ceil(filteredCerts.length / PAGE_SIZE));
  const certPaginated  = filteredCerts.slice((certPage - 1) * PAGE_SIZE, certPage * PAGE_SIZE);

  // ── Export CSV helpers ─────────────────────────────────
  const exportCSV = (rows: string[][], filename: string) => {
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportCertificates = () => exportCSV(
    [
      ["Nomor Sertifikat", "Nama Intern", "Email", "Posisi", "Program", "Tanggal Terbit"],
      ...filteredCerts.map(c => [c.certNumber, c.internName, c.internEmail, c.position, c.programTitle, formatDate(c.issuedAt)]),
    ],
    `sertifikat-${new Date().toISOString().slice(0, 10)}.csv`
  );

  const exportHistory = () => exportCSV(
    [
      ["Nama", "Email", "Role", "Status", "Tanggal Daftar", "Tanggal Proses", "Alasan"],
      ...filteredHistory.map(u => {
        const processed = u.approvalStatus === "APPROVED" ? u.approvedAt : u.rejectedAt;
        return [u.name ?? "-", u.email, u.role, u.approvalStatus, formatDate(u.createdAt), formatDate(processed), u.approvalReason ?? "-"];
      }),
    ],
    `registrasi-${new Date().toISOString().slice(0, 10)}.csv`
  );

  const internTotal = internStatus.ongoing + internStatus.upcoming + internStatus.completed;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="bg-white/70 p-6 rounded-2xl border border-slate-100 shadow-sm backdrop-blur-md">
        <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">Ringkasan eksekutif kondisi program magang secara keseluruhan.</p>
      </div>

      {/* ── Section 1: Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Intern</p>
            <p className="text-2xl font-bold text-slate-800 leading-tight">{summary.totalInterns}</p>
            <p className="text-xs text-slate-400 mt-0.5">ongoing + upcoming + completed</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50">
            <TrendingUp className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Completion Rate</p>
            <p className="text-2xl font-bold text-violet-600 leading-tight">{summary.completionRate}%</p>
            <p className="text-xs text-slate-400 mt-0.5">intern selesai program</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
            <ClipboardList className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Logbook</p>
            <p className="text-2xl font-bold text-slate-800 leading-tight">{summary.totalLogbooks}</p>
            <p className="text-xs text-slate-400 mt-0.5">{logbookSummary.pending} pending review</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
            <Award className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Sertifikat Terbit</p>
            <p className="text-2xl font-bold text-emerald-600 leading-tight">{summary.totalCertificates}</p>
            <p className="text-xs text-slate-400 mt-0.5">dari {summary.totalInterns} intern</p>
          </div>
        </div>
      </div>

      {/* ── Section 2: Distribusi Status Intern + Logbook ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Status intern */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-4">Distribusi Status Intern</h2>
          <div className="space-y-3">
            {[
              { label: "On Going", value: internStatus.ongoing,   color: "bg-emerald-500", text: "text-emerald-600" },
              { label: "Upcoming", value: internStatus.upcoming,  color: "bg-amber-400",   text: "text-amber-600" },
              { label: "Completed",value: internStatus.completed, color: "bg-violet-500",  text: "text-violet-600" },
            ].map(item => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-600">{item.label}</span>
                  <span className={`font-bold ${item.text}`}>{item.value} intern</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                    style={{ width: internTotal > 0 ? `${(item.value / internTotal) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Logbook summary */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-4">Ringkasan Logbook</h2>
          <div className="space-y-3">
            {[
              { label: "Approved", value: logbookSummary.approved, color: "bg-emerald-500", text: "text-emerald-600" },
              { label: "Pending",  value: logbookSummary.pending,  color: "bg-amber-400",   text: "text-amber-600" },
              { label: "Rejected", value: logbookSummary.rejected, color: "bg-rose-400",    text: "text-rose-600" },
            ].map(item => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-600">{item.label}</span>
                  <span className={`font-bold ${item.text}`}>{item.value}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                    style={{ width: logbookSummary.total > 0 ? `${(item.value / logbookSummary.total) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Rata-rata Overall Progress Intern</span>
            <span className="text-sm font-bold text-violet-600">{logbookSummary.avgProjectProgress}%</span>
          </div>
        </div>
      </div>

      {/* ── Section 3: Ringkasan per Program ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">Ringkasan per Program</h2>
          <p className="text-xs text-slate-400 mt-0.5">Statistik lamaran dan penerimaan tiap program magang.</p>
        </div>
        {programSummary.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">Belum ada program terdaftar.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {["Program", "Periode", "Status", "Pelamar", "Diterima", "Ditolak", "Pending", "Seleksi"].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {programSummary.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800 text-sm">{p.title}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">{p.period ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        p.status === "published" ? "bg-emerald-100 text-emerald-700"
                          : p.status === "closed" ? "bg-slate-100 text-slate-600"
                          : "bg-amber-100 text-amber-600"
                      }`}>
                        {p.status === "published" ? "Aktif" : p.status === "closed" ? "Selesai" : "Draft"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-bold text-slate-700">{p.totalApplicants}</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-emerald-600">{p.accepted}</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-rose-500">{p.rejected}</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-amber-500">{p.pending}</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-blue-500">{p.inReview}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Section 3.5: Mentor Aktif ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">Mentor Aktif</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {mentorData.length} mentor terdaftar — jumlah intern yang dibimbing tiap mentor.
          </p>
        </div>
        {mentorData.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">Belum ada mentor terdaftar.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {["Mentor", "Total Intern", "On Going", "Completed"].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {mentorData.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold ${avatarColor(m.name)}`}>
                          {initials(m.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{m.name}</p>
                          <p className="text-xs text-slate-400 truncate">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-bold text-slate-700">{m.totalInterns}</span>
                      {m.totalInterns === 0 && (
                        <span className="ml-2 text-[10px] text-slate-400 italic">belum ada intern</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-bold text-emerald-600">{m.activeInterns}</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-violet-600">{m.completedInterns}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Section 4: Sertifikat Diterbitkan ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">Sertifikat Diterbitkan</h2>
            <p className="text-xs text-slate-400 mt-0.5">{certificateList.length} sertifikat total</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama / nomor..."
                value={certSearch}
                onChange={e => { setCertSearch(e.target.value); setCertPage(1); }}
                className="rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition w-44"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCertificates}
              className="border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </div>

        {filteredCerts.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">Belum ada sertifikat diterbitkan.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {["Nomor Sertifikat", "Intern", "Posisi", "Program", "Tanggal Terbit"].map(h => (
                      <th key={h} className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {certPaginated.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded-lg text-slate-700">{c.certNumber}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold ${avatarColor(c.internName)}`}>
                            {initials(c.internName)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{c.internName}</p>
                            <p className="text-xs text-slate-400 truncate">{c.internEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">{c.position}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">{c.programTitle}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">{formatDate(c.issuedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {certTotalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                  {((certPage - 1) * PAGE_SIZE) + 1}–{Math.min(certPage * PAGE_SIZE, filteredCerts.length)} dari {filteredCerts.length}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCertPage(p => Math.max(1, p - 1))} disabled={certPage === 1} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40 transition">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  {Array.from({ length: Math.min(certTotalPages, 5) }, (_, i) => {
                    const p = certTotalPages <= 5 ? i + 1 : certPage <= 3 ? i + 1 : certPage >= certTotalPages - 2 ? certTotalPages - 4 + i : certPage - 2 + i;
                    return <button key={p} onClick={() => setCertPage(p)} className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition ${p === certPage ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{p}</button>;
                  })}
                  <button onClick={() => setCertPage(p => Math.min(certTotalPages, p + 1))} disabled={certPage === certTotalPages} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40 transition">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Section 5: Pending Registrations ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">Pending Registrations</h2>
            <p className="text-xs text-slate-400 mt-0.5">Pendaftaran intern dan mentor yang menunggu persetujuan.</p>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${pending.length > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
            {pending.length > 0 ? `${pending.length} menunggu` : "Semua selesai ✓"}
          </span>
        </div>

        {pending.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 mx-auto">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Semua registrasi sudah diproses</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {["Pendaftar", "Role", "Mendaftar", "Aksi"].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pending.map(user => {
                  const isLoading  = loadingId === user.id;
                  const showReject = rejectForms[user.id];
                  const name       = user.name ?? "Tanpa Nama";
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold ${avatarColor(name)}`}>
                            {initials(user.name)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{name}</p>
                            <p className="text-xs text-slate-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-medium text-slate-600">{user.role === "INTERN" ? "Intern" : "Mentor"}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">{timeAgo(user.createdAt)}</td>
                      <td className="px-5 py-3.5">
                        {showReject ? (
                          <div className="space-y-2">
                            <textarea
                              rows={2}
                              placeholder="Alasan penolakan (opsional)"
                              value={rejectReasons[user.id] ?? ""}
                              onChange={e => setRejectReasons(prev => ({ ...prev, [user.id]: e.target.value }))}
                              className="w-full rounded-lg border border-slate-200 p-2 text-xs outline-none focus:border-red-400 resize-none"
                            />
                            <div className="flex gap-1.5">
                              <Button size="sm" variant="outline" onClick={() => setRejectForms(prev => ({ ...prev, [user.id]: false }))} className="text-slate-500 text-xs">Batal</Button>
                              <Button size="sm" disabled={isLoading} onClick={() => handleReject(user.id)} className="bg-red-600 hover:bg-red-700 text-white text-xs gap-1">
                                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                                Tolak
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button size="sm" disabled={isLoading} onClick={() => handleApprove(user.id)} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-semibold text-xs border border-emerald-200 gap-1 h-8">
                              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" disabled={isLoading} onClick={() => setRejectForms(prev => ({ ...prev, [user.id]: true }))} className="border-red-200 text-red-500 hover:bg-red-50 text-xs gap-1 h-8">
                              <X className="h-3 w-3" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Section 6: Registration History ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-800">Riwayat Registrasi</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                <span className="text-emerald-600 font-semibold">{approvedCount} disetujui</span>
                {" · "}
                <span className="text-rose-500 font-semibold">{rejectedCount} ditolak</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari nama / email..."
                  value={historySearch}
                  onChange={e => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                  className="rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition w-44"
                />
              </div>
              <select
                value={historyFilter}
                onChange={e => { setHistoryFilter(e.target.value as "all" | "APPROVED" | "REJECTED"); setHistoryPage(1); }}
                className="rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-7 text-xs text-slate-600 outline-none focus:border-blue-500 transition"
              >
                <option value="all">Semua ({history.length})</option>
                <option value="APPROVED">Disetujui ({approvedCount})</option>
                <option value="REJECTED">Ditolak ({rejectedCount})</option>
              </select>
              <Button variant="outline" size="sm" onClick={exportHistory} className="border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {["Nama / Email", "Role", "Tgl Daftar", "Tgl Proses", "Status", "Aksi"].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {historyPaginated.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">Tidak ada data.</td></tr>
              ) : historyPaginated.map(user => {
                const isApproved = user.approvalStatus === "APPROVED";
                const processed  = isApproved ? user.approvedAt : user.rejectedAt;
                return (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold ${avatarColor(user.name ?? "?")}`}>
                          {initials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{user.name ?? "Tanpa Nama"}</p>
                          <p className="text-xs text-slate-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600 font-medium">{user.role === "INTERN" ? "Intern" : "Mentor"}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">{formatDate(user.createdAt)}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">{formatDate(processed)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${isApproved ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"}`}>
                        {isApproved ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {isApproved ? "Disetujui" : "Ditolak"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="relative">
                        <button
                          onClick={() => setDetailUser(user)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Detail"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {historyTotalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">{((historyPage - 1) * PAGE_SIZE) + 1}–{Math.min(historyPage * PAGE_SIZE, filteredHistory.length)} dari {filteredHistory.length}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40 transition">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {Array.from({ length: Math.min(historyTotalPages, 5) }, (_, i) => {
                const p = historyTotalPages <= 5 ? i + 1 : historyPage <= 3 ? i + 1 : historyPage >= historyTotalPages - 2 ? historyTotalPages - 4 + i : historyPage - 2 + i;
                return <button key={p} onClick={() => setHistoryPage(p)} className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition ${p === historyPage ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{p}</button>;
              })}
              <button onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))} disabled={historyPage === historyTotalPages} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40 transition">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {detailUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Detail Registrasi</h3>
              <button onClick={() => setDetailUser(null)} className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white font-bold text-sm ${avatarColor(detailUser.name ?? "?")}`}>
                  {initials(detailUser.name)}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{detailUser.name ?? "Tanpa Nama"}</p>
                  <p className="text-xs text-slate-500">{detailUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Role",          detailUser.role === "INTERN" ? "Intern" : "Mentor"],
                  ["Status",        detailUser.approvalStatus === "APPROVED" ? "Disetujui" : "Ditolak"],
                  ["Tgl Daftar",    formatDate(detailUser.createdAt)],
                  ["Tgl Proses",    formatDate(detailUser.approvalStatus === "APPROVED" ? detailUser.approvedAt : detailUser.rejectedAt)],
                ].map(([label, val]) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                    <p className="font-semibold text-slate-700 text-xs">{val}</p>
                  </div>
                ))}
              </div>
              {detailUser.approvalStatus === "REJECTED" && detailUser.approvalReason && (
                <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                  <p className="text-xs font-semibold text-rose-600 mb-0.5">Alasan Penolakan</p>
                  <p className="text-xs text-rose-700">{detailUser.approvalReason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
