"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, ArrowLeft, Loader2, CheckCircle, ShieldAlert, Eye, EyeOff } from "lucide-react";
import {
  validateResetTokenAction,
  resetPasswordAction
} from "@/features/auth/services/forgot-password.actions";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params.token === "string" ? params.token : "";

  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validasi token saat halaman di-load
  useEffect(() => {
    if (!token) {
      setTokenError("Token tidak valid.");
      setValidating(false);
      return;
    }
    validateResetTokenAction(token).then((res) => {
      setTokenValid(res.valid);
      if (!res.valid) setTokenError(res.error ?? "Link tidak valid.");
      setValidating(false);
    });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = await resetPasswordAction(token, newPassword, confirmPassword);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    }
  };

  // ── Loading validasi ──
  if (validating) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm">Memvalidasi link reset password...</p>
        </div>
      </main>
    );
  }

  // ── Token tidak valid / expired ──
  if (!tokenValid) {
    return (
      <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-12">
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-red-400/20 blur-3xl" />
        <section className="w-full max-w-md rounded-2xl border border-white/20 bg-white/70 p-8 shadow-2xl backdrop-blur-lg text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mx-auto">
            <ShieldAlert className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Link Tidak Valid</h1>
          <p className="text-sm text-slate-500">{tokenError}</p>
          <div className="pt-2 space-y-2">
            <Link href="/forgot-password">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Minta Link Baru
              </Button>
            </Link>
            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 font-medium transition pt-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Login
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />
      <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />

      <section className="w-full max-w-md rounded-2xl border border-white/20 bg-white/70 p-8 shadow-2xl backdrop-blur-lg">

        {success ? (
          /* ── Success State ── */
          <div className="text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mx-auto">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Password Berhasil Diubah!</h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Password Anda telah berhasil diperbarui. Anda akan diarahkan ke halaman login dalam beberapa detik.
            </p>
            <Link href="/login">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2">
                Login Sekarang
              </Button>
            </Link>
          </div>
        ) : (
          /* ── Form State ── */
          <>
            <div className="text-center space-y-2 mb-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 mx-auto mb-4">
                <KeyRound className="h-7 w-7 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Buat Password Baru
              </h1>
              <p className="text-sm text-slate-500">
                Masukkan password baru untuk akun Anda. Minimal 8 karakter.
              </p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Password Baru */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700" htmlFor="new-password">
                  Password Baru
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="new-password"
                    type={showNew ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-slate-200 bg-white/50 py-2.5 pl-10 pr-10 text-sm outline-none transition duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700" htmlFor="confirm-password">
                  Konfirmasi Password Baru
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white/50 py-2.5 pl-10 pr-10 text-sm outline-none transition duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Indikator match */}
                {confirmPassword && (
                  <p className={`text-xs font-medium mt-1 ${newPassword === confirmPassword ? "text-emerald-600" : "text-red-500"}`}>
                    {newPassword === confirmPassword ? "✓ Password cocok" : "✗ Password tidak cocok"}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading || !newPassword || !confirmPassword}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 font-medium text-white shadow-lg hover:from-blue-700 hover:to-indigo-700 transition duration-300 py-6"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Password Baru"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center border-t border-slate-100 pt-5">
              <Link
                href="/login"
                className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 font-medium transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Login
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
