"use client";

import { useState, useMemo } from "react";
import {
  Users, Check, X, Search, Link as LinkIcon,
  Eye, ChevronLeft, ChevronRight, Download,
  ClipboardList, Clock, CheckCircle, XCircle,
  ChevronDown, MessageSquare, SortAsc
} from "lucide-react";
import { reviewApplicationAction, createSelectionSessionAction } from "../services/applicant.actions";
import { Button } from "@/components/ui/button";

type User = {
  id: string;
  name: string | null;
  email: string;
  nickname?: string | null;
  phone?: string | null;
  gender?: string | null;
  birthPlace?: string | null;
  birthDate?: Date | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  institution?: string | null;
  faculty?: string | null;
  studyProgram?: string | null;
  studentId?: string | null;
  semester?: number | null;
  entryYear?: number | null;
  graduationYear?: number | null;
  portfolioUrl?: string | null;
  linkedinUrl?: string | null;
  githubUsername?: string | null;
  skills?: string | null;
  bio?: string | null;
  organizationExperience?: string | null;
  workExperience?: string | null;
};
type Program = { id: string; title: string; period?: string | null };

type Application = {
  id: string;
  userId: string;
  programId: string;
  status: string;
  position: string | null;
  cvUrl: string | null;
  notes: string | null;
  createdAt: Date;
  user: User;
  program: Program;
  selectionSessions?: {
    id: string;
    title: string;
    type: string;
    scheduledAt: Date;
    method: string;
    location: string | null;
    meetingLink: string | null;
    interviewerName: string | null;
    status: string;
    score: number | null;
    resultNotes: string | null;
    notes: string | null;
  }[];
};

type ApplicantManagerProps = {
  initialApplications: Application[];
};

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-orange-500", "bg-pink-500", "bg-teal-500",
  "bg-rose-500", "bg-indigo-500", "bg-amber-500",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string | null) {
  if (!name) return "??";
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

const PAGE_SIZE = 8;
const normalizedStatus = (status: string) => (
  { PENDING: "pending", IN_REVIEW: "review", INTERVIEW: "review", ACCEPTED: "approved", REJECTED: "rejected", WITHDRAWN: "rejected" }[status] ?? status
);

export function ApplicantManager({ initialApplications }: Readonly<ApplicantManagerProps>) {
  const [applications, setApplications] = useState<Application[]>(initialApplications);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const [detailApp, setDetailApp] = useState<Application | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectionApp, setSelectionApp] = useState<Application | null>(null);
  const [selectionForm, setSelectionForm] = useState({
    title: "", type: "INTERVIEW", scheduledAt: "", method: "ONLINE",
    location: "", meetingLink: "", interviewerName: "", notes: ""
  });

  // Counts for filter tabs
  const counts = useMemo(() => ({
    all: applications.length,
    pending:  applications.filter(a => normalizedStatus(a.status) === "pending").length,
    review:   applications.filter(a => normalizedStatus(a.status) === "review").length,
    approved: applications.filter(a => normalizedStatus(a.status) === "approved").length,
    rejected: applications.filter(a => normalizedStatus(a.status) === "rejected").length,
  }), [applications]);

  // Total stat card = pending + approved + rejected (exclude in-review/interview)
  const totalStatCount = counts.pending + counts.approved + counts.rejected;

  const filteredApps = useMemo(() => {
    let list = applications.filter(app => {
      const matchStatus = filterStatus === "all" || normalizedStatus(app.status) === filterStatus;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        (app.user.name?.toLowerCase().includes(q) ?? false) ||
        app.user.email.toLowerCase().includes(q) ||
        app.program.title.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
    list = [...list].sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? -diff : diff;
    });
    return list;
  }, [applications, filterStatus, searchQuery, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredApps.length / PAGE_SIZE));
  const paginated = filteredApps.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handlePageChange = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setCurrentPage(p);
  };

  const setFilter = (s: string) => { setFilterStatus(s); setCurrentPage(1); };
  const setSearch = (s: string) => { setSearchQuery(s); setCurrentPage(1); };

  const handleReview = async (id: string, status: "approved" | "rejected", notes?: string) => {
    setIsSubmitting(true);
    try {
      const res = await reviewApplicationAction(id, status, notes);
      if (res.error) {
        alert(res.error);
      } else {
        setApplications(prev =>
          prev.map(app => app.id === id ? { ...app, status, notes: notes ?? app.notes } : app)
        );
        setRejectingId(null);
        setRejectNotes("");
      }
    } catch {
      alert("Gagal memproses pendaftaran.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSelection = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectionApp) return;
    setIsSubmitting(true);
    const result = await createSelectionSessionAction({
      applicationId: selectionApp.id,
      ...selectionForm,
      type: selectionForm.type as "INTERVIEW",
      method: selectionForm.method as "ONLINE" | "OFFLINE"
    });
    if (result.error) {
      alert(result.error);
    } else {
      setApplications(current => current.map(app =>
        app.id === selectionApp.id
          ? {
              ...app,
              status: selectionForm.type.includes("INTERVIEW") ? "INTERVIEW" : "IN_REVIEW",
              selectionSessions: [
                ...(app.selectionSessions ?? []),
                {
                  id: crypto.randomUUID(),
                  title: selectionForm.title,
                  type: selectionForm.type,
                  scheduledAt: new Date(selectionForm.scheduledAt),
                  method: selectionForm.method,
                  location: selectionForm.method === "OFFLINE" ? selectionForm.location : null,
                  meetingLink: selectionForm.method === "ONLINE" ? selectionForm.meetingLink : null,
                  interviewerName: selectionForm.interviewerName || null,
                  status: "SCHEDULED",
                  score: null,
                  resultNotes: null,
                  notes: selectionForm.notes || null
                }
              ]
            }
          : app
      ));
      setSelectionApp(null);
    }
    setIsSubmitting(false);
  };

  const handleExport = () => {
    const rows = [
      ["Nama", "Email", "Program", "Posisi", "Batch", "Tanggal Daftar", "Status"],
      ...filteredApps.map(a => [
        a.user.name ?? "-",
        a.user.email,
        a.program.title,
        a.position ?? "-",
        a.program.period ?? "-",
        new Date(a.createdAt).toLocaleDateString("id-ID"),
        a.status,
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "applications.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const StatCard = ({
    icon, label, value, sub, iconBg
  }: { icon: React.ReactNode; label: string; value: number; sub: string; iconBg: string }) => (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-start gap-4 flex-1 min-w-0">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
        <p className="text-2xl font-bold text-slate-800 leading-tight">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>
      </div>
    </div>
  );

  const filterTabs = [
    { id: "all",      label: "All",      count: counts.all },
    { id: "pending",  label: "Pending",  count: counts.pending },
    { id: "review",   label: "Review",   count: counts.review },
    { id: "approved", label: "Accepted", count: counts.approved },
    { id: "rejected", label: "Rejected", count: counts.rejected },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white/70 p-6 rounded-2xl border border-slate-100 shadow-sm backdrop-blur-md">
        <h1 className="text-2xl font-bold text-slate-800">Applications</h1>
        <p className="text-sm text-slate-500 mt-0.5">Review and process incoming internship applications</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<ClipboardList className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50"
          label="Total Applications"
          value={totalStatCount}
          sub="Pending + Accepted + Rejected"
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          iconBg="bg-amber-50"
          label="Pending Review"
          value={counts.pending}
          sub="Waiting for review"
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5 text-emerald-500" />}
          iconBg="bg-emerald-50"
          label="Accepted"
          value={counts.approved}
          sub={totalStatCount > 0 ? `${Math.round((counts.approved / totalStatCount) * 100)}% acceptance rate` : "acceptance rate"}
        />
        <StatCard
          icon={<XCircle className="h-5 w-5 text-red-400" />}
          iconBg="bg-red-50"
          label="Rejected"
          value={counts.rejected}
          sub="of total applicants"
        />
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Applications</h2>
              <p className="text-xs text-slate-400">Review and process the incoming internship applications</p>
            </div>
            <Button
              onClick={handleExport}
              variant="outline"
              className="border-slate-200 text-slate-600 hover:bg-slate-50 text-xs gap-1.5 self-start sm:self-auto"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-1">
              {filterTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filterStatus === tab.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    filterStatus === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}

              <div className="flex items-center gap-2 ml-auto">
                <div className="relative hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Cari nama / program..."
                    value={searchQuery}
                    onChange={e => setSearch(e.target.value)}
                    className="rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition w-48"
                  />
                </div>
                <button
                  onClick={() => setSortOrder(s => s === "newest" ? "oldest" : "newest")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition font-medium"
                >
                  <SortAsc className="h-3.5 w-3.5" />
                  Sort: {sortOrder === "newest" ? "Newest" : "Oldest"}
                  <ChevronDown className="h-3 w-3 ml-0.5" />
                </button>
              </div>
            </div>

            <div className="relative sm:hidden">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama / program..."
                value={searchQuery}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
          </div>
        </div>

        {paginated.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">Tidak ada pendaftar ditemukan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3 w-[22%]">Applicant</th>
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 w-[18%]">Program</th>
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 w-[16%]">Posisi</th>
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 w-[9%]">Period</th>
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 w-[11%]">Applied Date</th>
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 w-[10%]">Status</th>
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 w-[14%]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginated.map(app => {
                  const name = app.user.name ?? "Tanpa Nama";
                  const initials = getInitials(app.user.name);
                  const avatarColor = getAvatarColor(name);
                  return (
                    <tr key={app.id} className="hover:bg-slate-50/50 transition group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold ${avatarColor}`}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 text-sm truncate">{name}</p>
                            <p className="text-xs text-slate-400 truncate">{app.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm text-slate-700 font-medium leading-snug">{app.program.title}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        {app.position ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {app.position}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-slate-500 font-medium">{app.program.period ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs text-slate-600">
                          {new Date(app.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric", month: "short", year: "numeric"
                          })}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          normalizedStatus(app.status) === "approved" ? "bg-emerald-100 text-emerald-700"
                            : normalizedStatus(app.status) === "rejected" ? "bg-red-100 text-red-600"
                            : normalizedStatus(app.status) === "review"  ? "bg-blue-100 text-blue-600"
                            : "bg-amber-100 text-amber-600"
                        }`}>
                          {normalizedStatus(app.status) === "approved" ? "Accepted"
                            : normalizedStatus(app.status) === "rejected" ? "Rejected"
                            : normalizedStatus(app.status) === "review"  ? "In Selection"
                            : "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setDetailApp(app)}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="Detail"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {app.status !== "ACCEPTED" && app.status !== "approved" && (
                            <button
                              disabled={isSubmitting}
                              onClick={() => { if (confirm("Terima applicant ini sebagai Intern?")) handleReview(app.id, "approved"); }}
                              className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition disabled:opacity-40"
                              title="Terima"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => { setSelectionApp(app); setSelectionForm({ title: "", type: "INTERVIEW", scheduledAt: "", method: "ONLINE", location: "", meetingLink: "", interviewerName: "", notes: "" }); }}
                            className="text-xs text-blue-600 hover:underline"
                            title="Tambah sesi seleksi"
                          >
                            Seleksi
                          </button>
                          {app.status !== "rejected" && (
                            <button
                              disabled={isSubmitting}
                              onClick={() => { setRejectingId(app.id); setRejectNotes(""); }}
                              className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-40"
                              title="Tolak"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filteredApps.length)} of {filteredApps.length} applications
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40 transition">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let p: number;
                if (totalPages <= 5) p = i + 1;
                else if (currentPage <= 3) p = i + 1;
                else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
                else p = currentPage - 2 + i;
                return (
                  <button key={p} onClick={() => handlePageChange(p)} className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition ${p === currentPage ? "bg-blue-600 text-white shadow-sm" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    {p}
                  </button>
                );
              })}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="text-slate-400 text-xs px-1">…</span>
                  <button onClick={() => handlePageChange(totalPages)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">{totalPages}</button>
                </>
              )}
              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40 transition">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white font-bold text-sm ${getAvatarColor(detailApp.user.name ?? "?")}`}>
                  {getInitials(detailApp.user.name)}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{detailApp.user.name ?? "Tanpa Nama"}</p>
                  <p className="text-xs text-slate-500">{detailApp.user.email}</p>
                </div>
              </div>
              <button onClick={() => setDetailApp(null)} className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {([
                  ["Program",        detailApp.program.title],
                  ["Posisi Dilamar", detailApp.position ?? "—"],
                  ["Period",         detailApp.program.period ?? "—"],
                  ["Tanggal Daftar", new Date(detailApp.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })],
                ] as [string, string][]).map(([label, val]) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-slate-700">{val}</p>
                  </div>
                ))}
              </div>
              {detailApp.notes && (
                <div className="bg-slate-50 rounded-xl p-3 flex gap-2">
                  <MessageSquare className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-0.5">Pesan / Motivasi</p>
                    <p className="text-sm text-slate-700">{detailApp.notes}</p>
                  </div>
                </div>
              )}
              {detailApp.cvUrl && (
                <a href={detailApp.cvUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline font-semibold">
                  <LinkIcon className="h-3.5 w-3.5" />
                  Buka Tautan CV / Lampiran
                </a>
              )}
              {/* Informasi Pribadi */}
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                  <p className="text-sm font-semibold text-blue-900">Informasi Pribadi</p>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {([
                    ["Nama Panggilan", detailApp.user.nickname],
                    ["Nomor Telepon",  detailApp.user.phone],
                    ["Tempat Lahir",   detailApp.user.birthPlace],
                    ["Tanggal Lahir",  detailApp.user.birthDate ? new Date(detailApp.user.birthDate).toLocaleDateString("id-ID") : null],
                    ["Jenis Kelamin",  detailApp.user.gender],
                    ["Kota/Kabupaten", detailApp.user.city],
                    ["Provinsi",       detailApp.user.province],
                    ["Alamat",         detailApp.user.address],
                  ] as [string, string | null | undefined][]).map(([label, val]) => (
                    <div key={label} className={label === "Alamat" ? "col-span-2 sm:col-span-3" : ""}>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
                      <p className="text-sm text-slate-700 font-medium">{val ?? <span className="text-slate-300 font-normal">—</span>}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Pendidikan */}
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <div className="px-4 py-3 bg-violet-50 border-b border-violet-100">
                  <p className="text-sm font-semibold text-violet-900">Pendidikan</p>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {([
                    ["Institusi",     detailApp.user.institution],
                    ["Fakultas",      detailApp.user.faculty],
                    ["Program Studi", detailApp.user.studyProgram],
                    ["NIM",           detailApp.user.studentId],
                    ["Semester",      detailApp.user.semester?.toString()],
                    ["Tahun Masuk",   detailApp.user.entryYear?.toString()],
                    ["Tahun Lulus",   detailApp.user.graduationYear?.toString()],
                  ] as [string, string | null | undefined][]).map(([label, val]) => (
                    <div key={label}>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
                      <p className="text-sm text-slate-700 font-medium">{val ?? <span className="text-slate-300 font-normal">—</span>}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Skill & Portfolio */}
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-800">Skill & Portfolio</p>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([["Skills", detailApp.user.skills], ["GitHub", detailApp.user.githubUsername]] as [string, string | null | undefined][]).map(([label, val]) => (
                    <div key={label}>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
                      <p className="text-sm text-slate-700 font-medium">{val ?? <span className="text-slate-300 font-normal">—</span>}</p>
                    </div>
                  ))}
                  {([["Portfolio URL", detailApp.user.portfolioUrl], ["LinkedIn URL", detailApp.user.linkedinUrl]] as [string, string | null | undefined][]).map(([label, val]) => (
                    <div key={label}>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
                      {val ? <a href={val} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline font-medium truncate block">{val}</a> : <span className="text-sm text-slate-300">—</span>}
                    </div>
                  ))}
                  {detailApp.user.bio && (
                    <div className="col-span-1 sm:col-span-2">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Bio</p>
                      <p className="text-sm text-slate-700">{detailApp.user.bio}</p>
                    </div>
                  )}
                </div>
              </div>
              {/* Riwayat Seleksi */}
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
                  <p className="text-sm font-semibold text-amber-900">Riwayat Seleksi</p>
                </div>
                <div className="p-4">
                  {detailApp.selectionSessions?.length ? (
                    <div className="space-y-3">
                      {detailApp.selectionSessions.map(item => (
                        <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                          {/* Header: judul + status badge */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{item.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {item.type.replace(/_/g, " ")} &middot;{" "}
                                {new Date(item.scheduledAt).toLocaleString("id-ID", {
                                  day: "numeric", month: "long", year: "numeric",
                                  hour: "2-digit", minute: "2-digit"
                                })}
                              </p>
                            </div>
                            <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === "COMPLETED"   ? "bg-emerald-100 text-emerald-700"
                              : item.status === "CANCELLED" ? "bg-red-100 text-red-600"
                              : item.status === "RESCHEDULED" ? "bg-amber-100 text-amber-600"
                              : "bg-blue-100 text-blue-600"
                            }`}>
                              {item.status.replace(/_/g, " ")}
                            </span>
                          </div>

                          {/* Info grid: metode, lokasi/link, pewawancara */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            <div>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Metode</p>
                              <p className="text-xs font-medium text-slate-700">{item.method}</p>
                            </div>

                            {item.method === "ONLINE" && item.meetingLink ? (
                              <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Link Meeting</p>
                                <a
                                  href={item.meetingLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-blue-600 hover:underline font-medium truncate block"
                                >
                                  {item.meetingLink}
                                </a>
                              </div>
                            ) : item.method === "OFFLINE" && item.location ? (
                              <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Lokasi</p>
                                <p className="text-xs font-medium text-slate-700">{item.location}</p>
                              </div>
                            ) : null}

                            {item.interviewerName && (
                              <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Pewawancara</p>
                                <p className="text-xs font-medium text-slate-700">{item.interviewerName}</p>
                              </div>
                            )}

                            {item.score != null && (
                              <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Skor</p>
                                <p className="text-xs font-bold text-blue-700">{item.score}</p>
                              </div>
                            )}
                          </div>

                          {/* Catatan sesi */}
                          {item.notes && (
                            <div className="pt-1 border-t border-slate-100">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Catatan</p>
                              <p className="text-xs text-slate-600">{item.notes}</p>
                            </div>
                          )}

                          {/* Hasil/result notes */}
                          {item.resultNotes && (
                            <div className="pt-1 border-t border-slate-100">
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Hasil</p>
                              <p className="text-xs text-slate-600">{item.resultNotes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Belum ada sesi seleksi.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="shrink-0 px-6 py-4 border-t border-slate-100 flex justify-end">
              <button onClick={() => setDetailApp(null)} className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selection Modal */}
      {selectionApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={handleCreateSelection} className="w-full max-w-lg space-y-3 rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex justify-between">
              <div>
                <h3 className="font-bold">Tambah Sesi Seleksi</h3>
                <p className="text-sm text-slate-500">{selectionApp.user.name ?? selectionApp.user.email}</p>
              </div>
              <button type="button" onClick={() => setSelectionApp(null)}><X /></button>
            </div>
            <input required placeholder="Judul sesi" className="w-full rounded border p-2" value={selectionForm.title} onChange={e => setSelectionForm({ ...selectionForm, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <select className="rounded border p-2" value={selectionForm.type} onChange={e => setSelectionForm({ ...selectionForm, type: e.target.value })}>
                <option value="ADMINISTRATION">Administrasi</option>
                <option value="INTERVIEW">Interview</option>
                <option value="TECHNICAL_TEST">Technical Test</option>
                <option value="HR_INTERVIEW">HR Interview</option>
                <option value="FINAL_INTERVIEW">Final Interview</option>
                <option value="OTHER">Lainnya</option>
              </select>
              <select className="rounded border p-2" value={selectionForm.method} onChange={e => setSelectionForm({ ...selectionForm, method: e.target.value })}>
                <option value="ONLINE">Online</option>
                <option value="OFFLINE">Offline</option>
              </select>
            </div>
            <input required type="datetime-local" className="w-full rounded border p-2" value={selectionForm.scheduledAt} onChange={e => setSelectionForm({ ...selectionForm, scheduledAt: e.target.value })} />
            <input placeholder={selectionForm.method === "ONLINE" ? "Link meeting" : "Lokasi"} className="w-full rounded border p-2" value={selectionForm.method === "ONLINE" ? selectionForm.meetingLink : selectionForm.location} onChange={e => setSelectionForm(selectionForm.method === "ONLINE" ? { ...selectionForm, meetingLink: e.target.value } : { ...selectionForm, location: e.target.value })} />
            <input placeholder="Penilai / pewawancara" className="w-full rounded border p-2" value={selectionForm.interviewerName} onChange={e => setSelectionForm({ ...selectionForm, interviewerName: e.target.value })} />
            <textarea placeholder="Catatan" className="w-full rounded border p-2" value={selectionForm.notes} onChange={e => setSelectionForm({ ...selectionForm, notes: e.target.value })} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSelectionApp(null)}>Batal</Button>
              <Button disabled={isSubmitting} className="bg-blue-600">{isSubmitting ? "Menyimpan..." : "Simpan sesi"}</Button>
            </div>
          </form>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Tolak Pendaftar</h3>
              <button onClick={() => setRejectingId(null)} className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">Tambahkan alasan penolakan (opsional).</p>
              <textarea
                rows={3}
                placeholder="Alasan penolakan..."
                value={rejectNotes}
                onChange={e => setRejectNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition resize-none"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRejectingId(null)} className="text-slate-600 border-slate-200">Batal</Button>
                <Button disabled={isSubmitting} onClick={() => handleReview(rejectingId, "rejected", rejectNotes)} className="bg-red-600 hover:bg-red-700 text-white gap-1.5">
                  {isSubmitting ? "Memproses..." : "Tolak Pendaftar"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
