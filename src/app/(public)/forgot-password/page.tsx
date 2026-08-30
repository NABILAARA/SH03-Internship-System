"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Loader2, CheckCircle, ShieldAlert } from "lucide-react";
import { forgotPasswordAction } from "@/features/auth/services/forgot-password.actions";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = await forgotPasswordAction(email);

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  };

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
            <h1 className="text-2xl font-bold text-slate-800">Email Terkirim!</h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Kami telah mengirimkan link reset password ke{" "}
              <span className="font-semibold text-slate-700">{email}</span>.
              Silakan cek inbox atau folder spam Anda.
            </p>
            <p className="text-xs text-slate-400">
              Link berlaku selama <strong>1 jam</strong>. Jika tidak menerima email, coba lagi.
            </p>
            <div className="pt-2 space-y-2">
              <Button
                onClick={() => { setSuccess(false); setEmail(""); }}
                variant="outline"
                className="w-full border-slate-200 text-slate-600"
              >
                Kirim Ulang
              </Button>
              <Link
                href="/login"
                className="flex items-center justify-center gap-1.5 text-sm text-blue-600 hover:text-indigo-600 font-semibold transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Login
              </Link>
            </div>
          </div>
        ) : (
          /* ── Form State ── */
          <>
            <div className="text-center space-y-2 mb-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 mx-auto mb-4">
                <Mail className="h-7 w-7 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Lupa Password?
              </h1>
              <p className="text-sm text-slate-500">
                Masukkan email yang terdaftar. Kami akan mengirimkan link untuk mereset password Anda.
              </p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700" htmlFor="email">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white/50 py-2.5 pl-10 pr-4 text-sm outline-none transition duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !email}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 font-medium text-white shadow-lg hover:from-blue-700 hover:to-indigo-700 transition duration-300 py-6"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  "Kirim Link Reset Password"
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
