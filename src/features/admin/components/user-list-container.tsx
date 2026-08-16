"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Users, Search, Plus, X, ChevronLeft, ChevronRight,
  Users2, CheckCircle2, Clock4, Award,
} from "lucide-react";
import { getUsersByRole, addInternByAdminAction } from "../services/user-management.actions";
import { UserList } from "./user-list";
import { Button } from "@/components/ui/button";
import { UserRole } from "@/types/roles";

interface Application {
  id: string;
  status: string;
  cvUrl: string | null;
  createdAt: Date;
  program: { title: string };
}

interface Mentor {
  id: string;
  name: string | null;
  email: string;
}

interface Program {
  id: string;
  title: string;
  period: string | null;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  approvalStatus: string;
  createdAt: Date;
  approvedAt: Date | null;
  applications?: Application[];
  assignedMentor?: Mentor | null;
  certificate?: { certNumber: string; issuedAt: Date } | null;
  googleDriveRegistered?: boolean;
  googleDriveFolderUrl?: string | null;
  // Informasi Pribadi
  nickname?: string | null;
  phone?: string | null;
  gender?: string | null;
  birthPlace?: string | null;
  birthDate?: Date | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  // Pendidikan
  institution?: string | null;
  studyProgram?: string | null;
  faculty?: string | null;
  studentId?: string | null;
  semester?: number | null;
  entryYear?: number | null;
  graduationYear?: number | null;
  // Skill & Portfolio
  portfolioUrl?: string | null;
  linkedinUrl?: string | null;
  githubUsername?: string | null;
  skills?: string | null;
  bio?: string | null;
  organizationExperience?: string | null;
  workExperience?: string | null;
  // Informasi Internship
  internshipPosition?: string | null;
  internshipStatus?: string | null;
  internshipStartDate?: Date | null;
  internshipEndDate?: Date | null;
  supervisorName?: string | null;
  documentStatus?: string | null;
}

interface UserListContainerProps {
  initialData: User[];
  role: UserRole;
  roleLabel: string;
  mentors?: Mentor[];
  programs?: Program[];
}

const PAGE_SIZE = 8;

const INTERNSHIP_POSITIONS = [
  "UI/UX Designer",
  "Frontend Developer",
  "Backend Developer",
  "QA/Software Tester & Documentation",
  "Repository E-Prints",
  "Social Media Specialist",
  "Corporate Identity Designer",
  "AI & Security Engineer",
  "DevOps Engineer",
  "AI/LM Engineer",
  "Academic Publishing Intern",
  "Branding and Graphic Designer",
] as const;

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

export function UserListContainer({
  initialData,
  role,
  roleLabel,
  mentors = [],
  programs = [],
}: Readonly<UserListContainerProps>) {
  const [users, setUsers] = useState<User[]>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProgram, setFilterProgram] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterGoogleDrive, setFilterGoogleDrive] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Add Intern modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addProgram, setAddProgram] = useState("");
  const [addPosition, setAddPosition] = useState("");
  const [addMentor, setAddMentor] = useState("");
  const [addSuccess, setAddSuccess] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  // Detail modal
  const [detailUser, setDetailUser] = useState<User | null>(null);

  // Auto-refresh every 10s
  useEffect(() => {
    const iv = setInterval(() => {
      getUsersByRole(role).then(r => { if (r.data) setUsers(r.data as User[]); });
    }, 10000);
    return () => clearInterval(iv);
  }, [role]);

  // Stat counts
  const counts = useMemo(() => {
    const completed = users.filter(u => !!u.certificate).length;
    // ongoing  = ACCEPTED + sudah ada mentor
    const ongoing   = users.filter(u =>
      !u.certificate &&
      u.applications?.some(a => a.status === "ACCEPTED") &&
      !!u.assignedMentor
    ).length;
    // upcoming = ACCEPTED + belum ada mentor
    const upcoming  = users.filter(u =>
      !u.certificate &&
      u.applications?.some(a => a.status === "ACCEPTED") &&
      !u.assignedMentor
    ).length;
    // total = ongoing + upcoming + completed (hanya intern dengan application ACCEPTED)
    const total = ongoing + upcoming + completed;
    return { total, ongoing, upcoming, completed };
  }, [users]);

  // Filtered list
  const filtered = useMemo(() => {
    return users.filter(u => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        (u.name?.toLowerCase().includes(q) ?? false) ||
        u.email.toLowerCase().includes(q);

      const matchProgram =
        filterProgram === "all" ||
        u.applications?.some(a => a.program.title === filterProgram);

      const hasAccepted = u.applications?.some(a => a.status === "ACCEPTED");
      const hasCert     = !!u.certificate;
      const hasMentor   = !!u.assignedMentor;
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "ongoing"   && hasAccepted && hasMentor  && !hasCert) ||
        (filterStatus === "upcoming"  && hasAccepted && !hasMentor && !hasCert) ||
        (filterStatus === "completed" && hasCert);

      const matchGoogleDrive = filterGoogleDrive === "all" || (filterGoogleDrive === "registered" ? u.googleDriveRegistered : !u.googleDriveRegistered);
      return matchSearch && matchProgram && matchStatus && matchGoogleDrive;
    });
  }, [users, searchQuery, filterProgram, filterStatus, filterGoogleDrive]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const setPage = (p: number) => { if (p >= 1 && p <= totalPages) setCurrentPage(p); };
  const setSearch  = (s: string) => { setSearchQuery(s); setCurrentPage(1); };
  const setProgF   = (s: string) => { setFilterProgram(s); setCurrentPage(1); };
  const setStatF   = (s: string) => { setFilterStatus(s); setCurrentPage(1); };

  // Unique program titles for dropdown
  const programTitles = useMemo(() => {
    const set = new Set<string>();
    users.forEach(u => u.applications?.forEach(a => set.add(a.program.title)));
    return Array.from(set).sort();
  }, [users]);

  const handleAddIntern = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError(null);
    try {
      const res = await addInternByAdminAction({
        name: addName,
        email: addEmail,
        password: addPassword,
        programId: addProgram,
        position: addPosition,
        mentorId: addMentor || undefined,
      });
      if (res.error) {
        setAddError(res.error);
      } else {
        setAddSuccess(true);
        // Refresh data
        getUsersByRole(role).then(r => { if (r.data) setUsers(r.data as User[]); });
        setTimeout(() => closeAdd(), 1800);
      }
    } catch {
      setAddError("Gagal mendaftarkan intern.");
    } finally {
      setAddLoading(false);
    }
  };

  const closeAdd = () => {
    setShowAddModal(false);
    setAddName(""); setAddEmail(""); setAddPassword("");
    setAddProgram(""); setAddPosition(""); setAddMentor("");
    setAddError(null); setAddSuccess(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white/70 p-6 rounded-2xl border border-slate-100 shadow-sm backdrop-blur-md">
        <h1 className="text-2xl font-bold text-slate-800">Interns</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage all registered interns across programs</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <Users2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Interns</p>
            <p className="text-2xl font-bold text-slate-800 leading-tight">{counts.total}</p>
            <p className="text-xs text-slate-400 mt-0.5">All registered interns</p>
          </div>
        </div>
        {/* On Going */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">On Going</p>
            <p className="text-2xl font-bold text-slate-800 leading-tight">{counts.ongoing}</p>
            <p className="text-xs text-slate-400 mt-0.5">Active interns</p>
          </div>
        </div>
        {/* Upcoming */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
            <Clock4 className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Upcoming</p>
            <p className="text-2xl font-bold text-slate-800 leading-tight">{counts.upcoming}</p>
            <p className="text-xs text-slate-400 mt-0.5">Not enrolled yet</p>
          </div>
        </div>
        {/* Completed */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50">
            <Award className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Completed</p>
            <p className="text-2xl font-bold text-slate-800 leading-tight">{counts.completed}</p>
            <p className="text-xs text-slate-400 mt-0.5">Certified interns</p>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Table toolbar */}
        <div className="p-5 border-b border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-800">All Interns</h2>
              <p className="text-xs text-slate-400">{filtered.length} interns terdaftar di seluruh program</p>
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-sm self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              Add Intern
            </Button>
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Program filter */}
            <select
              value={filterProgram}
              onChange={e => setProgF(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-xs text-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            >
              <option value="all">All Programs</option>
              {programTitles.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select value={filterGoogleDrive} onChange={e => { setFilterGoogleDrive(e.target.value); setCurrentPage(1); }} className="rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-xs text-slate-600 outline-none focus:border-blue-500">
              <option value="all">Google Drive: Semua</option><option value="registered">Google Drive: Terdaftar</option><option value="unregistered">Google Drive: Belum</option>
            </select>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={e => setStatF(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-xs text-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            >
              <option value="all">All Status</option>
              <option value="ongoing">On Going</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
            </select>

            {/* Search — pushed right */}
            <div className="relative ml-auto">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama atau email..."
                value={searchQuery}
                onChange={e => setSearch(e.target.value)}
                className="rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition w-52"
              />
              {searchQuery && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        {paginated.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">Tidak ada intern ditemukan.</p>
          </div>
        ) : (
          <UserList
            users={paginated}
            roleLabel={roleLabel}
            mentors={mentors}
            onRefresh={() => getUsersByRole(role).then(r => { if (r.data) setUsers(r.data as User[]); })}
            onViewDetail={(u) => setDetailUser(u)}
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Menampilkan {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} dari {filtered.length} interns
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40 transition">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let p: number;
                if (totalPages <= 5)            p = i + 1;
                else if (currentPage <= 3)       p = i + 1;
                else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
                else                             p = currentPage - 2 + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition ${
                      p === currentPage ? "bg-blue-600 text-white shadow-sm" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}>
                    {p}
                  </button>
                );
              })}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="text-slate-400 text-xs px-1">…</span>
                  <button onClick={() => setPage(totalPages)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                    {totalPages}
                  </button>
                </>
              )}
              <button onClick={() => setPage(currentPage + 1)} disabled={currentPage === totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40 transition">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add Intern Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Tambah Intern Baru</h3>
                <p className="text-xs text-slate-400 mt-0.5">Intern langsung terdaftar dan berstatus On Going</p>
              </div>
              <button onClick={closeAdd} className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {addSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                  </div>
                  <p className="font-bold text-slate-800">Intern berhasil didaftarkan!</p>
                  <p className="text-sm text-slate-500">Status langsung <span className="font-semibold text-emerald-600">On Going</span>.</p>
                </div>
              ) : (
                <form id="add-intern-form" onSubmit={handleAddIntern} className="space-y-4">
                  {addError && (
                    <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-xs text-red-700">{addError}</div>
                  )}

                  {/* Nama */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Nama Lengkap <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="Contoh: Rizky Pratama" value={addName}
                      onChange={e => setAddName(e.target.value)} required
                      className="w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Email <span className="text-red-500">*</span></label>
                    <input type="email" placeholder="name@gmail.com" value={addEmail}
                      onChange={e => setAddEmail(e.target.value)} required
                      className="w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Password <span className="text-red-500">*</span></label>
                    <input type="password" placeholder="Min. 6 karakter" value={addPassword}
                      onChange={e => setAddPassword(e.target.value)} required
                      className="w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
                    <p className="text-[10px] text-slate-400">Intern dapat mengganti password sendiri di halaman profil.</p>
                  </div>

                  {/* Program */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Program Magang <span className="text-red-500">*</span></label>
                    <select value={addProgram} onChange={e => setAddProgram(e.target.value)} required
                      className="w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition">
                      <option value="">Pilih program...</option>
                      {programs.map(p => (
                        <option key={p.id} value={p.id}>{p.title} {p.period ? `(${p.period})` : ""}</option>
                      ))}
                    </select>
                  </div>

                  {/* Posisi */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Posisi yang Dilamar <span className="text-red-500">*</span></label>
                    <select value={addPosition} onChange={e => setAddPosition(e.target.value)} required
                      className="w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition">
                      <option value="">Pilih posisi...</option>
                      {INTERNSHIP_POSITIONS.map(pos => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                  </div>

                  {/* Mentor */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Assign Mentor</label>
                    <select value={addMentor} onChange={e => setAddMentor(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition">
                      <option value="">Auto-assign mentor tersedia</option>
                      {mentors.map(m => (
                        <option key={m.id} value={m.id}>{m.name ?? m.email}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400">Kosongkan untuk auto-assign mentor pertama yang tersedia.</p>
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            {!addSuccess && (
              <div className="shrink-0 flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={closeAdd} className="text-slate-600 border-slate-200">
                  Batal
                </Button>
                <Button type="submit" form="add-intern-form" disabled={addLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {addLoading ? "Menyimpan..." : "Daftarkan Intern"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {detailUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white font-bold text-sm ${avatarColor(detailUser.name ?? "?")}`}>
                  {initials(detailUser.name)}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{detailUser.name ?? "Tanpa Nama"}</p>
                  <p className="text-xs text-slate-500">{detailUser.email}</p>
                </div>
              </div>
              <button onClick={() => setDetailUser(null)} className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-5">

              {/* ── Informasi Pribadi ── */}
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                  <p className="text-sm font-semibold text-blue-900">Informasi Pribadi</p>
                  <p className="text-xs text-blue-600">Data kontak dan domisili</p>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {([
                    ["Nama Lengkap",    detailUser.name],
                    ["Nama Panggilan",  detailUser.nickname],
                    ["Nomor Telepon",   detailUser.phone],
                    ["Tempat Lahir",    detailUser.birthPlace],
                    ["Tanggal Lahir",   detailUser.birthDate ? new Date(detailUser.birthDate).toLocaleDateString("id-ID") : null],
                    ["Jenis Kelamin",   detailUser.gender],
                    ["Kota/Kabupaten",  detailUser.city],
                    ["Provinsi",        detailUser.province],
                    ["Alamat",          detailUser.address],
                  ] as [string, string | null | undefined][]).map(([label, val]) => (
                    <div key={label} className={label === "Alamat" ? "col-span-2 sm:col-span-3" : ""}>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
                      <p className="text-sm text-slate-700 font-medium">{val ?? <span className="text-slate-300 font-normal">—</span>}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Pendidikan ── */}
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <div className="px-4 py-3 bg-violet-50 border-b border-violet-100">
                  <p className="text-sm font-semibold text-violet-900">Pendidikan</p>
                  <p className="text-xs text-violet-600">Informasi akademik</p>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {([
                    ["Institusi",      detailUser.institution],
                    ["Fakultas",       detailUser.faculty],
                    ["Program Studi",  detailUser.studyProgram],
                    ["NIM",            detailUser.studentId],
                    ["Semester",       detailUser.semester?.toString()],
                    ["Tahun Masuk",    detailUser.entryYear?.toString()],
                    ["Tahun Lulus",    detailUser.graduationYear?.toString()],
                  ] as [string, string | null | undefined][]).map(([label, val]) => (
                    <div key={label}>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
                      <p className="text-sm text-slate-700 font-medium">{val ?? <span className="text-slate-300 font-normal">—</span>}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Skill & Portfolio ── */}
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-800">Skill & Portfolio</p>
                  <p className="text-xs text-slate-500">Tautan profesional dan keahlian</p>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([
                    ["Skills",  detailUser.skills],
                    ["GitHub",  detailUser.githubUsername],
                  ] as [string, string | null | undefined][]).map(([label, val]) => (
                    <div key={label}>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
                      <p className="text-sm text-slate-700 font-medium">{val ?? <span className="text-slate-300 font-normal">—</span>}</p>
                    </div>
                  ))}
                  {([
                    ["Portfolio URL", detailUser.portfolioUrl],
                    ["LinkedIn URL",  detailUser.linkedinUrl],
                  ] as [string, string | null | undefined][]).map(([label, val]) => (
                    <div key={label}>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
                      {val
                        ? <a href={val} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline font-medium truncate block">{val}</a>
                        : <span className="text-sm text-slate-300">—</span>}
                    </div>
                  ))}
                  {detailUser.bio && (
                    <div className="col-span-1 sm:col-span-2">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Bio</p>
                      <p className="text-sm text-slate-700">{detailUser.bio}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Informasi Internship ── */}
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
                  <p className="text-sm font-semibold text-amber-900">Informasi Internship</p>
                  <p className="text-xs text-amber-600">Data penempatan</p>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {([
                    ["Program",    detailUser.applications?.[0]?.program.title],
                    ["Posisi",     detailUser.internshipPosition],
                    ["Supervisor", detailUser.supervisorName],
                    ["Status",     detailUser.internshipStatus],
                    ["Dokumen",    detailUser.documentStatus],
                    ["Mentor",     detailUser.assignedMentor?.name],
                    ["Sertifikat", detailUser.certificate?.certNumber],
                    ["Mulai",      detailUser.applications?.[0]?.createdAt
                                    ? new Date(detailUser.applications[0].createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                                    : null],
                    ["Selesai",    detailUser.certificate?.issuedAt
                                    ? new Date(detailUser.certificate.issuedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                                    : null],
                  ] as [string, string | null | undefined][]).map(([label, val]) => (
                    <div key={label}>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
                      <p className="text-sm text-slate-700 font-medium">{val ?? <span className="text-slate-300 font-normal">—</span>}</p>
                    </div>
                  ))}
                  {detailUser.googleDriveFolderUrl && (
                    <div className="col-span-2 sm:col-span-3">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Google Drive</p>
                      <a href={detailUser.googleDriveFolderUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline font-medium truncate block">
                        {detailUser.googleDriveFolderUrl}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* CV link */}
              {detailUser.applications?.[0]?.cvUrl && (
                <a href={detailUser.applications[0].cvUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline font-semibold">
                  Buka Tautan CV / Lampiran
                </a>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 px-6 py-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setDetailUser(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
