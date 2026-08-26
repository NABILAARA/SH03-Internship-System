"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search, Plus, X, Users2, Star, BookOpen,
  Trash2, Loader2, Mail, UserCheck,
} from "lucide-react";
import { getUsersByRole, deleteUser, addMentorByAdminAction } from "../services/user-management.actions";
import { Button } from "@/components/ui/button";

/* ─── Types ────────────────────────────────────────────── */
interface Mentor {
  id: string;
  name: string | null;
  email: string;
  role: string;
  approvalStatus: string;
  createdAt: Date;
  approvedAt: Date | null;
  assignedInterns?: {
    id: string;
    name: string | null;
    email: string;
    applications?: { status: string; program: { title: string } }[];
  }[];
  certificate?: { certNumber: string; issuedAt: Date } | null;
}


interface MentorListContainerProps {
  initialData: Mentor[];
}

/* ─── Helpers ───────────────────────────────────────────── */
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

/* ─── Main Component ───────────────────────────────────── */
export function MentorListContainer({
  initialData,
}: Readonly<MentorListContainerProps>) {
  const [mentors, setMentors] = useState<Mentor[]>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [detailMentor, setDetailMentor] = useState<Mentor | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add Mentor modal state
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addSuccess, setAddSuccess] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  // Auto-refresh every 10s
  useEffect(() => {
    const iv = setInterval(() => {
      getUsersByRole("MENTOR").then(r => { if (r.data) setMentors(r.data as Mentor[]); });
    }, 10000);
    return () => clearInterval(iv);
  }, []);

  // Stat counts
  const counts = useMemo(() => {
    const total = mentors.length;
    const totalInterns = mentors.reduce((acc, m) => acc + (m.assignedInterns?.length ?? 0), 0);
    const avgPerMentor = total > 0 ? (totalInterns / total).toFixed(1) : "0";
    // Programs Covered = jumlah program unik dari intern yang aktif (ACCEPTED) di semua mentor
    const programsCovered = new Set(
      mentors.flatMap(m =>
        (m.assignedInterns ?? []).flatMap(intern =>
          (intern.applications ?? [])
            .filter(a => a.status === "ACCEPTED")
            .map(a => a.program.title)
        )
      )
    ).size;
    return { total, totalInterns, avgPerMentor, programsCovered };
  }, [mentors]);

  // Filtered list
  const filtered = useMemo(() => {
    if (!searchQuery) return mentors;
    const q = searchQuery.toLowerCase();
    return mentors.filter(m =>
      (m.name?.toLowerCase().includes(q) ?? false) ||
      m.email.toLowerCase().includes(q)
    );
  }, [mentors, searchQuery]);

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus mentor ini secara permanen?")) return;
    setDeletingId(id);
    await deleteUser(id);
    setMentors(prev => prev.filter(m => m.id !== id));
    setDeletingId(null);
    if (detailMentor?.id === id) setDetailMentor(null);
  };

  const handleAddMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError(null);
    try {
      const res = await addMentorByAdminAction({ name: addName, email: addEmail, password: addPassword });
      if (res.error) {
        setAddError(res.error);
      } else {
        setAddSuccess(true);
        getUsersByRole("MENTOR").then(r => { if (r.data) setMentors(r.data as Mentor[]); });
        setTimeout(() => closeAdd(), 1800);
      }
    } catch {
      setAddError("Gagal menambahkan mentor.");
    } finally {
      setAddLoading(false);
    }
  };

  const closeAdd = () => {
    setShowAddModal(false);
    setAddName(""); setAddEmail(""); setAddPassword("");
    setAddError(null); setAddSuccess(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white/70 p-6 rounded-2xl border border-slate-100 shadow-sm backdrop-blur-md">
        <h1 className="text-2xl font-bold text-slate-800">Mentors</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage mentor assignments and workload</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <Users2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Total Mentors</p>
            <p className="text-2xl font-bold text-slate-800 leading-tight">{counts.total}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
            <UserCheck className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Interns Mentored</p>
            <p className="text-2xl font-bold text-slate-800 leading-tight">{counts.totalInterns}</p>
            <p className="text-xs text-slate-400 mt-0.5">avg {counts.avgPerMentor} per mentor</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50">
            <Star className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Avg Rating</p>
            <p className="text-2xl font-bold text-slate-800 leading-tight">—</p>
            <p className="text-xs text-slate-400 mt-0.5">from intern feedback</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50">
            <BookOpen className="h-5 w-5 text-teal-500" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Programs Covered</p>
            <p className="text-2xl font-bold text-slate-800 leading-tight">{counts.programsCovered}</p>
            <p className="text-xs text-slate-400 mt-0.5">all active programs</p>
          </div>
        </div>
      </div>

      {/* All Mentors section */}
      <div className="space-y-4">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-800">All Mentors</h2>
            <p className="text-xs text-slate-400">Kelola beban kerja dan program mentor</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama atau email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                maxLength={100}
                className="rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition w-48"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-sm"
            >
              <Plus className="h-4 w-4" />
              Add Mentor
            </Button>
          </div>
        </div>

        {/* Mentor Cards Grid */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-16 text-center">
            <Users2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">Tidak ada mentor ditemukan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(mentor => {
              const name   = mentor.name ?? "Tanpa Nama";
              const color  = avatarColor(name);
              const ini    = initials(mentor.name);
              const internCount = mentor.assignedInterns?.length ?? 0;
              const isDeleting = deletingId === mentor.id;

              return (
                <div
                  key={mentor.id}
                  className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition group relative"
                >
                  {/* Delete button — appears on hover */}
                  <button
                    onClick={() => handleDelete(mentor.id)}
                    disabled={isDeleting}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 flex h-7 w-7 items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition"
                    title="Hapus mentor"
                  >
                    {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>

                  {/* Avatar + name */}
                  <div
                    className="flex items-center gap-3 mb-4 cursor-pointer"
                    onClick={() => setDetailMentor(mentor)}
                  >
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white font-bold text-sm ${color}`}>
                      {ini}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{name}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {mentor.approvalStatus === "APPROVED" ? "Active Mentor" : mentor.approvalStatus}
                      </p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{mentor.email}</span>
                    </div>
                  </div>

                  {/* Divider + Assigned Interns count */}
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                      Assigned Interns
                    </p>
                    <p className="text-xl font-bold text-slate-800">{internCount}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add Mentor Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Tambah Mentor Baru</h3>
                <p className="text-xs text-slate-400 mt-0.5">Akun langsung aktif dan siap di-assign ke intern</p>
              </div>
              <button onClick={closeAdd} className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5">
              {addSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                    <UserCheck className="h-7 w-7 text-emerald-600" />
                  </div>
                  <p className="font-bold text-slate-800">Mentor berhasil ditambahkan!</p>
                  <p className="text-sm text-slate-500">Akun sudah <span className="font-semibold text-emerald-600">aktif</span> dan siap di-assign ke intern.</p>
                </div>
              ) : (
                <form id="add-mentor-form" onSubmit={handleAddMentor} className="space-y-4">
                  {addError && (
                    <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-xs text-red-700">{addError}</div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Nama Lengkap <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="Contoh: Budi Santoso" value={addName}
                      onChange={e => setAddName(e.target.value)} required
                      className="w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Email <span className="text-red-500">*</span></label>
                    <input type="email" placeholder="name@gmail.com" value={addEmail}
                      onChange={e => setAddEmail(e.target.value)} required
                      className="w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Password <span className="text-red-500">*</span></label>
                    <input type="password" placeholder="Min. 6 karakter" value={addPassword}
                      onChange={e => setAddPassword(e.target.value)} required
                      className="w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
                    <p className="text-[10px] text-slate-400">Mentor dapat mengganti password sendiri di halaman profil.</p>
                  </div>
                </form>
              )}
            </div>

            {!addSuccess && (
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={closeAdd} className="text-slate-600 border-slate-200">Batal</Button>
                <Button type="submit" form="add-mentor-form" disabled={addLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {addLoading ? "Menyimpan..." : "Tambahkan Mentor"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {detailMentor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Detail Mentor</h3>
              <button onClick={() => setDetailMentor(null)} className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white font-bold text-sm ${avatarColor(detailMentor.name ?? "?")}`}>
                  {initials(detailMentor.name)}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{detailMentor.name ?? "Tanpa Nama"}</p>
                  <p className="text-xs text-slate-500">{detailMentor.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-0.5">Status</p>
                  <p className="font-semibold text-slate-700 text-xs">{detailMentor.approvalStatus}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-0.5">Assigned Interns</p>
                  <p className="font-semibold text-slate-700 text-xs">{detailMentor.assignedInterns?.length ?? 0} intern</p>
                </div>
              </div>

              {/* Assigned intern list */}
              {detailMentor.assignedInterns && detailMentor.assignedInterns.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">Peserta yang Dibimbing</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {detailMentor.assignedInterns.map(intern => (
                      <div key={intern.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold ${avatarColor(intern.name ?? "?")}`}>
                          {initials(intern.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">{intern.name ?? intern.email}</p>
                          <p className="text-[10px] text-slate-400 truncate">{intern.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delete from modal */}
              <div className="pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  disabled={deletingId === detailMentor.id}
                  onClick={() => handleDelete(detailMentor.id)}
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 text-xs gap-1.5"
                >
                  {deletingId === detailMentor.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />}
                  Hapus Mentor
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
