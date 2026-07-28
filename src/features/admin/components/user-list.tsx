"use client";

import { useState } from "react";
import {
  Eye, Pencil, MoreHorizontal, Loader2,
  UserCheck, UserX, Trash2, Check, X,
} from "lucide-react";
import {
  deleteUser,
  assignMentorToIntern,
  unassignMentorFromIntern,
} from "../services/user-management.actions";

/* ─── Types ─────────────────────────────────────────────── */
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
  assignedInterns?: { id: string; name: string | null; email: string }[];
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

interface UserListProps {
  users: User[];
  roleLabel: string;
  mentors?: Mentor[];
  onRefresh?: () => void;
  onViewDetail?: (u: User) => void;
}

/* ─── Helpers ────────────────────────────────────────────── */
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

/** Derive a status label + colour from the user's data */
function getStatus(u: User): { label: string; cls: string } {
  if (u.certificate) return { label: "Completed", cls: "bg-slate-100 text-slate-600" };
  const accepted = u.applications?.some(a => a.status === "ACCEPTED");
  if (accepted && u.assignedMentor) return { label: "On Going", cls: "bg-emerald-100 text-emerald-700" };
  if (accepted && !u.assignedMentor) return { label: "Upcoming", cls: "bg-blue-100 text-blue-600" };
  const pending = u.applications?.some(a => a.status === "pending" || a.status === "PENDING");
  if (pending) return { label: "Pending", cls: "bg-amber-100 text-amber-700" };
  return { label: "—", cls: "bg-slate-100 text-slate-400" };
}

/** Fake a logbook-progress bar width (0-100) based on status */
function attendanceWidth(u: User): number {
  if (u.certificate) return 100;
  if (u.applications?.some(a => a.status === "ACCEPTED") && u.assignedMentor) {
    return Math.floor(40 + (u.id.charCodeAt(0) % 50));
  }
  return 0;
}

/* ─── Edit-mentor inline popover state ──────────────────── */
interface EditState {
  internId: string;
  selectedMentorId: string;
}

/* ─── Main component ─────────────────────────────────────── */
export function UserList({
  users,
  mentors = [],
  onRefresh,
  onViewDetail,
}: Readonly<UserListProps>) {
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [edit,        setEdit]        = useState<EditState | null>(null);
  const [openMenuId,  setOpenMenuId]  = useState<string | null>(null);

  /* optimistic mentor map */
  const [assignedMentors, setAssignedMentors] = useState<Record<string, Mentor | null>>(() => {
    const m: Record<string, Mentor | null> = {};
    users.forEach(u => { m[u.id] = u.assignedMentor ?? null; });
    return m;
  });

  const handleDelete = async (userId: string) => {
    if (!confirm("Hapus intern ini secara permanen?")) return;
    setDeletingId(userId);
    await deleteUser(userId);
    setDeletingId(null);
    onRefresh?.();
  };

  const handleAssign = async (internId: string, mentorId: string) => {
    setAssigningId(internId);
    const res = await assignMentorToIntern(internId, mentorId);
    if (res.error) { alert(res.error); }
    else {
      const mentor = mentors.find(m => m.id === mentorId) ?? null;
      setAssignedMentors(prev => ({ ...prev, [internId]: mentor }));
      setEdit(null);
    }
    setAssigningId(null);
  };

  const handleUnassign = async (internId: string) => {
    setAssigningId(internId);
    const res = await unassignMentorFromIntern(internId);
    if (res.error) { alert(res.error); }
    else { setAssignedMentors(prev => ({ ...prev, [internId]: null })); setEdit(null); }
    setAssigningId(null);
  };

  if (users.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-slate-500">
        Tidak ada intern ditemukan.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3 w-[26%]">Intern</th>
              <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 w-[18%]">Program</th>
              <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 w-[14%]">Mentor</th>
              <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 w-[12%]">Status</th>
              <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Google Drive</th>
              <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 w-[16%]">Attendance</th>
              <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 w-[14%]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map(user => {
              const name       = user.name ?? "Tanpa Nama";
              const color      = avatarColor(name);
              const ini        = initials(user.name);
              const status     = getStatus(user);
              const pct        = attendanceWidth(user);
              const mentor     = assignedMentors[user.id] !== undefined ? assignedMentors[user.id] : user.assignedMentor ?? null;
              const hasAccApp  = user.applications?.some(a => a.status === "ACCEPTED");
              const canAssign  = user.approvalStatus === "APPROVED" && hasAccApp && mentors.length > 0;
              const isEditing  = edit?.internId === user.id;
              const isAssigning = assigningId === user.id;
              const isDeleting  = deletingId  === user.id;
              const menuOpen    = openMenuId  === user.id;

              return (
                <tr key={user.id} className="hover:bg-slate-50/50 transition">
                  {/* Intern */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold ${color}`}>
                        {ini}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{name}</p>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Program */}
                  <td className="px-4 py-3.5">
                    <p className="text-xs text-slate-700 font-medium leading-snug">
                      {user.applications?.[0]?.program.title ?? "—"}
                    </p>
                  </td>

                  <td className="px-4 py-3.5"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${user.googleDriveRegistered ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{user.googleDriveRegistered ? "Terdaftar" : "Belum terdaftar"}</span></td>

                  {/* Mentor — inline edit */}
                  <td className="px-4 py-3.5">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <select
                          autoFocus
                          value={edit.selectedMentorId}
                          onChange={e => setEdit({ internId: user.id, selectedMentorId: e.target.value })}
                          disabled={isAssigning}
                          className="rounded border border-slate-200 py-1 px-1.5 text-xs outline-none focus:border-blue-400 max-w-[110px]"
                        >
                          <option value="">-- Pilih --</option>
                          {mentors.map(m => (
                            <option key={m.id} value={m.id}>{m.name ?? m.email}</option>
                          ))}
                        </select>
                        <button
                          disabled={!edit.selectedMentorId || isAssigning}
                          onClick={() => handleAssign(user.id, edit.selectedMentorId)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 disabled:opacity-40 transition"
                        >
                          {isAssigning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        </button>
                        <button
                          onClick={() => setEdit(null)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 group">
                        {mentor ? (
                          <>
                            <UserCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span className="text-xs text-slate-700 font-medium truncate max-w-[90px]">
                              {mentor.name ?? mentor.email}
                            </span>
                          </>
                        ) : (
                          <>
                            <UserX className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                            <span className="text-xs text-slate-400">—</span>
                          </>
                        )}
                        {canAssign && (
                          <button
                            onClick={() => setEdit({ internId: user.id, selectedMentorId: mentor?.id ?? "" })}
                            className="opacity-0 group-hover:opacity-100 transition ml-0.5 text-slate-400 hover:text-blue-500"
                            title="Ubah mentor"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${status.cls}`}>
                      {status.label}
                    </span>
                  </td>

                  {/* Attendance bar */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[60px]">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium w-7 shrink-0">{pct}%</span>
                    </div>
                  </td>

                  {/* Action icons */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 relative">
                      {/* Eye — detail */}
                      <button
                        onClick={() => onViewDetail?.(user)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                        title="Lihat detail"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      {/* Edit — open mentor assign */}
                      {canAssign && (
                        <button
                          onClick={() => setEdit({ internId: user.id, selectedMentorId: mentor?.id ?? "" })}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                          title="Assign/Ganti Mentor"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {/* More (⋮) — dropdown with unassign + delete */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(menuOpen ? null : user.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                          title="Lainnya"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>

                        {menuOpen && (
                          <div className="absolute right-0 top-8 z-20 w-44 bg-white rounded-xl border border-slate-100 shadow-lg py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                            {mentor && canAssign && (
                              <button
                                disabled={isAssigning}
                                onClick={() => { setOpenMenuId(null); handleUnassign(user.id); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-600 hover:bg-amber-50 transition"
                              >
                                <UserX className="h-3.5 w-3.5" />
                                Hapus Penugasan Mentor
                              </button>
                            )}
                            <button
                              disabled={isDeleting}
                              onClick={() => { setOpenMenuId(null); handleDelete(user.id); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition"
                            >
                              {isDeleting
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" />}
                              Hapus Intern
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Close menu on outside click */}
      {openMenuId && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
      )}
    </>
  );
}
