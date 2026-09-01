"use client";

import { useState } from "react";
import { User, Info, BookOpen, ChevronDown, ChevronUp, Shield, KeyRound, Pencil, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateAdminNameAction, changeAdminPasswordAction } from "../services/settings.actions";
import { AvatarEditModal } from "@/components/shared/avatar-edit-modal";

type AdminSettingsProps = {
  admin: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
    createdAt: Date;
  };
  nodeEnv: string;
};

const adminResponsibilities = [
  "Menyetujui/menolak registrasi Intern & Mentor",
  "Mengelola program magang yang tersedia",
  "Meninjau berkas dan lamaran peserta magang",
  "Memantau logbook harian peserta",
  "Menugaskan mentor kepada peserta magang"
];

type FeedbackState = { type: "success" | "error"; message: string } | null;

export function AdminSettings({ admin, nodeEnv }: Readonly<AdminSettingsProps>) {
  const [panduan, setPanduan] = useState(false);

  // Avatar
  const [avatarImage, setAvatarImage] = useState<string | null>(admin.image ?? null);

  // Edit nama
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(admin.name ?? "");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameFeedback, setNameFeedback] = useState<FeedbackState>(null);

  // Ganti password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<FeedbackState>(null);

  const joinedDate = new Date(admin.createdAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const isProduction = nodeEnv === "production";

  const handleSaveName = async () => {
    setNameLoading(true);
    setNameFeedback(null);
    const res = await updateAdminNameAction({ name });
    setNameLoading(false);
    if (res.error) {
      setNameFeedback({ type: "error", message: res.error });
    } else {
      setNameFeedback({ type: "success", message: "Nama berhasil diperbarui." });
      setEditingName(false);
    }
  };

  const handleCancelName = () => {
    setName(admin.name ?? "");
    setNameFeedback(null);
    setEditingName(false);
  };

  const handleChangePassword = async () => {
    setPasswordLoading(true);
    setPasswordFeedback(null);
    const res = await changeAdminPasswordAction({ currentPassword, newPassword, confirmPassword });
    setPasswordLoading(false);
    if (res.error) {
      setPasswordFeedback({ type: "error", message: res.error });
    } else {
      setPasswordFeedback({ type: "success", message: "Password berhasil diubah." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Profil Admin */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Profil Admin</h2>
        </div>

        {/* Avatar */}
        <div className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-5">
          <AvatarEditModal
            currentImage={avatarImage}
            name={admin.name}
            email={admin.email}
            onAvatarChange={(url) => setAvatarImage(url)}
          />
          <div>
            <p className="text-sm font-semibold text-slate-800">{name || "—"}</p>
            <p className="text-xs text-slate-400">{admin.email}</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Klik avatar untuk mengubah foto profil
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Nama */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Nama</p>
              {!editingName && (
                <button
                  onClick={() => setEditingName(true)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              )}
            </div>

            {editingName ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  placeholder="Masukkan nama"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveName}
                    disabled={nameLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 px-3"
                  >
                    {nameLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Simpan"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelName}
                    disabled={nameLoading}
                    className="text-xs h-7 px-3"
                  >
                    Batal
                  </Button>
                </div>
                {nameFeedback && (
                  <Feedback type={nameFeedback.type} message={nameFeedback.message} />
                )}
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-slate-800">{name || "—"}</p>
                {nameFeedback?.type === "success" && (
                  <Feedback type="success" message={nameFeedback.message} />
                )}
              </div>
            )}
          </div>

          {/* Email — read only */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">Email</p>
            <p className="text-sm font-semibold text-slate-800">{admin.email}</p>
          </div>

          {/* Role */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">Role</p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              <Shield className="h-3 w-3" />
              ADMIN
            </span>
          </div>

          {/* Bergabung */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">Bergabung Sejak</p>
            <p className="text-sm font-semibold text-slate-800">{joinedDate}</p>
          </div>
        </div>
      </div>

      {/* Ganti Password */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50">
            <KeyRound className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Ganti Password</h2>
            <p className="text-xs text-slate-400 mt-0.5">Minimal 8 karakter</p>
          </div>
        </div>

        <div className="space-y-4 max-w-md">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Password Saat Ini</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Password Baru</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Konfirmasi Password Baru</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>

          {passwordFeedback && (
            <Feedback type={passwordFeedback.type} message={passwordFeedback.message} />
          )}

          <Button
            onClick={handleChangePassword}
            disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 h-9"
          >
            {passwordLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Menyimpan...</>
            ) : (
              "Ubah Password"
            )}
          </Button>
        </div>
      </div>

      {/* Informasi Sistem */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50">
            <Info className="h-5 w-5 text-emerald-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Informasi Sistem</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">Nama Aplikasi</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">LEXA Internship Management System</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">Versi</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">1.0.0</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">Tech Stack</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">Next.js 15, Prisma ORM, Supabase PostgreSQL</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">Environment</p>
            <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isProduction ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}>
              {isProduction ? "Production" : "Development"}
            </span>
          </div>
        </div>
      </div>

      {/* Panduan Singkat */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <button
          onClick={() => setPanduan((prev) => !prev)}
          className="flex w-full items-center justify-between px-6 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-50">
              <BookOpen className="h-5 w-5 text-violet-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Panduan Singkat Admin</h2>
          </div>
          {panduan ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </button>

        {panduan && (
          <div className="border-t border-slate-100 px-6 pb-5 pt-4">
            <p className="mb-3 text-sm text-slate-500">Tanggung jawab utama sebagai Admin sistem:</p>
            <ul className="space-y-2">
              {adminResponsibilities.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function Feedback({ type, message }: { type: "success" | "error"; message: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
      type === "success"
        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
        : "bg-red-50 text-red-700 border border-red-100"
    }`}>
      {type === "success"
        ? <CheckCircle className="h-3.5 w-3.5 shrink-0" />
        : <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      }
      {message}
    </div>
  );
}
