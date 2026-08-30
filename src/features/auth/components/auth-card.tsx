"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, registerSchema } from "../schemas/auth.schema";
import { loginAction, registerAction } from "../services/auth.actions";
import { Button } from "@/components/ui/button";
import { Loader2, KeyRound, Mail, User as UserIcon, UserCheck, ShieldAlert } from "lucide-react";

type AuthCardProps = {
  mode: "login" | "register";
};

export function AuthCard({ mode }: Readonly<AuthCardProps>) {
  const isLogin = mode === "login";
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const schema = isLogin ? loginSchema : registerSchema;
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: isLogin
      ? { email: "", password: "" }
      : { name: "", email: "", password: "", role: "INTERN" }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = async (data: any) => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        const result = await loginAction({
          email: data.email,
          password: data.password,
        });

        if (result?.error) {
          setError(result.error);
          setIsLoading(false);
        } else {
          // Full reload agar cookie session yang baru di-set server langsung terbaca
          window.location.href = "/dashboard-redirect";
        }
      } else {
        const response = await registerAction(data);
        setIsLoading(false);
        
        if (response?.error) {
          setError(response.error);
        } else {
          const message = response?.message || "Pendaftaran berhasil! Silakan login untuk melanjutkan.";
          setSuccess(message);
          setTimeout(() => {
            router.push("/login");
          }, 2000);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Terlalu banyak percobaan. Coba lagi beberapa menit lagi.");
      setIsLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-12">
      {/* Decorative Background Gradients */}
      <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />
      <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />

      <section className="w-full max-w-md transform rounded-2xl border border-white/20 bg-white/70 p-8 shadow-2xl backdrop-blur-lg transition-all duration-300 hover:scale-[1.01]">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {isLogin ? "Selamat Datang Kembali" : "Mulai Perjalanan Magang"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isLogin
              ? "Silakan login untuk mengakses workspace magang Anda."
              : "Buat akun baru untuk mendaftar program magang LEXA."}
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-600">
            <UserCheck className="h-5 w-5 shrink-0 mt-0.5" />
            <p>{success}</p>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="name">
                Nama Lengkap
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white/50 py-2.5 pl-10 pr-4 text-sm outline-none transition duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  id="name"
                  placeholder="Masukkan nama lengkap Anda"
                  type="text"
                  {...register("name")}
                />
              </div>
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message as string}</p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700" htmlFor="email">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-200 bg-white/50 py-2.5 pl-10 pr-4 text-sm outline-none transition duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                id="email"
                placeholder="email@example.com"
                type="email"
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message as string}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-200 bg-white/50 py-2.5 pl-10 pr-4 text-sm outline-none transition duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                id="password"
                placeholder="••••••••"
                type="password"
                {...register("password")}
              />
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message as string}</p>
            )}
          </div>

          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="role">
                Pilih Role Akun
              </label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 px-4 text-sm outline-none transition duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                id="role"
                {...register("role")}
              >
                <option value="INTERN">Intern (Peserta Magang)</option>
                <option value="MENTOR">Mentor (Pembimbing)</option>
              </select>
            </div>
          )}

          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 font-medium text-white shadow-lg hover:from-blue-700 hover:to-indigo-700 transition duration-300 py-6"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mohon Tunggu...
              </>
            ) : isLogin ? (
              "Masuk Sekarang"
            ) : (
              "Daftar Akun"
            )}
          </Button>

          {isLogin && (
            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-xs text-slate-500 hover:text-blue-600 transition font-medium"
              >
                Lupa password?
              </Link>
            </div>
          )}
        </form>

        <div className="mt-8 text-center border-t border-slate-100 pt-6">
          <p className="text-sm text-slate-500">
            {isLogin ? "Belum punya akun magang?" : "Sudah memiliki akun?"}{" "}
            <Link
              className="font-semibold text-blue-600 hover:text-indigo-600 transition"
              href={isLogin ? "/register" : "/login"}
            >
              {isLogin ? "Daftar Akun Baru" : "Masuk di sini"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
