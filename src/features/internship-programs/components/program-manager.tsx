"use client";

import { useState, useMemo } from "react";
import {
  Plus, Trash2, Pencil, X, AlertCircle, Loader2, CheckCircle,
  FileText, Monitor, Palette, Smartphone, BarChart2,
  TrendingUp, Shield, BookOpen, Users2, CheckCircle2, Clock4, Award,
} from "lucide-react";
import {
  createProgramAction,
  updateProgramAction,
  deleteProgramAction,
} from "../services/program.actions";
import { Button } from "@/components/ui/button";

/* ─── Types ────────────────────────────────────────── */
type Program = {
  id: string;
  title: string;
  description: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  _count: { applications: number };
};

type ProgramManagerProps = {
  initialPrograms: Program[];
};

/* ─── Icon + colour per program (cycling) ──────────── */
const PROGRAM_ICONS = [
  { icon: Monitor,    bg: "bg-blue-50",   fg: "text-blue-500"   },
  { icon: Palette,    bg: "bg-violet-50", fg: "text-violet-500" },
  { icon: Smartphone, bg: "bg-emerald-50",fg: "text-emerald-500"},
  { icon: TrendingUp, bg: "bg-orange-50", fg: "text-orange-500" },
  { icon: BarChart2,  bg: "bg-pink-50",   fg: "text-pink-500"   },
  { icon: Shield,     bg: "bg-teal-50",   fg: "text-teal-500"   },
  { icon: BookOpen,   bg: "bg-amber-50",  fg: "text-amber-500"  },
];

/* Pseudo-random but stable progress 0-100 from id */
function progPct(id: string, status: string): number {
  if (status === "closed") return 100;
  if (status === "draft")  return 0;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return 30 + (Math.abs(h) % 65); // 30-94%
}

/* Colour for progress bar */
const PROGRESS_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-orange-500", "bg-pink-500", "bg-teal-500", "bg-amber-500",
];

/* ─── Component ─────────────────────────────────────── */
export function ProgramManager({ initialPrograms }: Readonly<ProgramManagerProps>) {
  const [programs, setPrograms]       = useState<Program[]>(initialPrograms);
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [deleteId, setDeleteId]       = useState<string | null>(null);
  const [isDeleting, setIsDeleting]   = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Form
  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate]     = useState("");
  const [endDate, setEndDate]         = useState("");
  const [status, setStatus]           = useState("published");

  // Stat counts
  const counts = useMemo(() => {
    const total     = programs.length;
    const ongoing   = programs.filter(p => p.status === "published").length;
    const upcoming  = programs.filter(p => p.status === "draft").length;
    const completed = programs.filter(p => p.status === "closed").length;
    return { total, ongoing, upcoming, completed };
  }, [programs]);

  /* ── Modal helpers ── */
  const openAdd = () => {
    setTitle(""); setDescription(""); setStartDate(""); setEndDate(""); setStatus("published");
    setEditingId(null); setError(null); setModalOpen(true);
  };

  const openEdit = (p: Program) => {
    setTitle(p.title); setDescription(p.description);
    setStartDate(p.startDate ? new Date(p.startDate).toISOString().split("T")[0] : "");
    setEndDate(p.endDate ? new Date(p.endDate).toISOString().split("T")[0] : "");
    setStatus(p.status);
    setEditingId(p.id); setError(null); setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditingId(null); setError(null); };

  /* ── CRUD ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("Nama program wajib diisi."); return; }

    setIsSubmitting(true); setError(null);
    const data = {
      title: title.trim(),
      description: description.trim(),
      startDate: startDate,
      endDate: endDate,
      status,
    };

    try {
      if (editingId) {
        const res = await updateProgramAction(editingId, data);
        if (res.error) { setError(res.error); return; }
        setPrograms(prev => prev.map(p => p.id === editingId ? {
          ...p,
          title: data.title,
          description: data.description,
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
          status: data.status,
        } : p));
      } else {
        const res = await createProgramAction(data);
        if (res.error) { setError(res.error); return; }
        setPrograms(prev => [
          {
            id: Math.random().toString(),
            title: data.title,
            description: data.description,
            startDate: data.startDate ? new Date(data.startDate) : null,
            endDate: data.endDate ? new Date(data.endDate) : null,
            status: data.status,
            _count: { applications: 0 }
          },
          ...prev,
        ]);
      }
      closeModal();
    } catch {
      setError("Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await deleteProgramAction(deleteId);
      if (res.error) { alert(res.error); return; }
      setPrograms(prev => prev.filter(p => p.id !== deleteId));
    } catch {
      alert("Gagal menghapus program.");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white/70 p-6 rounded-2xl border border-slate-100 shadow-sm backdrop-blur-md">
        <h1 className="text-2xl font-bold text-slate-800">Programs</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage all programs</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Total Programs</p>
            <p className="text-2xl font-bold text-slate-800 leading-tight">{counts.total}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">On Going</p>
            <p className="text-2xl font-bold text-slate-800 leading-tight">{counts.ongoing}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
            <Clock4 className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Upcoming</p>
            <p className="text-2xl font-bold text-slate-800 leading-tight">{counts.upcoming}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50">
            <Award className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Completed</p>
            <p className="text-2xl font-bold text-slate-800 leading-tight">{counts.completed}</p>
          </div>
        </div>
      </div>

      {/* All Programs section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">All Programs</h2>
          </div>
          <Button
            onClick={openAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-sm"
          >
            <Plus className="h-4 w-4" />
            Create Program
          </Button>
        </div>

        {/* Program Grid */}
        {programs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-16 text-center bg-white">
            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium text-sm">Belum ada program magang.</p>
            <p className="text-xs text-slate-400 mt-1">Klik tombol Create Program untuk membuat program pertama.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {programs.map((program, idx) => {
              const iconDef   = PROGRAM_ICONS[idx % PROGRAM_ICONS.length];
              const IconComp  = iconDef.icon;
              const pct = (() => {
                if (program.startDate && program.endDate) {
                  const now   = Date.now();
                  const start = new Date(program.startDate).getTime();
                  const end   = new Date(program.endDate).getTime();
                  if (now <= start) return 0;
                  if (now >= end)   return 100;
                  return Math.round(((now - start) / (end - start)) * 100);
                }
                return progPct(program.id, program.status);
              })();
              const barColor  = PROGRESS_COLORS[idx % PROGRESS_COLORS.length];

              return (
                <div
                  key={program.id}
                  className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col gap-4"
                >
                  {/* Top: icon + edit/delete */}
                  <div className="flex items-start justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconDef.bg}`}>
                      <IconComp className={`h-5 w-5 ${iconDef.fg}`} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEdit(program)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(program.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                        title="Hapus"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title + dates */}
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm leading-snug">{program.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {program.startDate && program.endDate
                        ? `${new Date(program.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} – ${new Date(program.endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`
                        : program.startDate
                        ? `Mulai ${new Date(program.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`
                        : "Periode belum ditentukan"}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Progress</span>
                      <span className="font-semibold text-slate-600">{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Interns count */}
                  <div className="flex items-end justify-end border-t border-slate-100 pt-3">
                    <div className="text-right">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Interns</p>
                      <div className="flex items-center gap-1 justify-end">
                        <Users2 className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-sm font-bold text-slate-700">{program._count?.applications ?? 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  {editingId ? "Edit Program" : "Create Program"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editingId ? "Perbarui informasi program magang." : "Tambahkan program magang baru ke sistem."}
                </p>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Program Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700" htmlFor="p-title">
                  Program Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="p-title"
                  type="text"
                  placeholder="e.g. Web Development Intern"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  autoFocus
                  className="w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              {/* Start Date + End Date row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="p-start">
                    Tanggal Mulai
                  </label>
                  <input
                    id="p-start"
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="p-end">
                    Tanggal Selesai
                  </label>
                  <input
                    id="p-end"
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700" htmlFor="p-status">Status</label>
                <select
                  id="p-status"
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                >
                  <option value="published">On Going (Aktif)</option>
                  <option value="draft">Upcoming (Draft)</option>
                  <option value="closed">Completed (Ditutup)</option>
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700" htmlFor="p-desc">Description</label>
                <textarea
                  id="p-desc"
                  rows={4}
                  placeholder="Deskripsikan tanggung jawab, kualifikasi, atau skill yang dipelajari..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={closeModal} className="text-slate-600 border-slate-200">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                  {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    <><CheckCircle className="h-4 w-4" /> {editingId ? "Save Changes" : "Create Program"}</>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Hapus Program?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Semua pendaftaran yang terkait juga akan ikut terhapus.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteId(null)} disabled={isDeleting} className="text-slate-600 border-slate-200">
                Batal
              </Button>
              <Button onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white gap-2">
                {isDeleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Menghapus...</> : "Ya, Hapus"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
