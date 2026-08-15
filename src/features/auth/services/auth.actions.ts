"use server";

import { prisma } from "@/lib/db";
import { hashPassword } from "@/utils/hash";
import { registerSchema } from "../schemas/auth.schema";
import { signIn } from "@/auth";
import { loginRatelimit } from "@/lib/ratelimit";
import { headers } from "next/headers";
import { AuthError } from "next-auth";

export async function registerAction(formData: Record<string, string>) {
  try {
    const validatedData = registerSchema.safeParse(formData);
    if (!validatedData.success) {
      return { error: "Data input tidak valid." };
    }

    const { email, password, name, role } = validatedData.data;

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return { error: "Email sudah terdaftar." };
    }

    const hashedPassword = hashPassword(password);

    // Set approval status: PENDING for INTERN/MENTOR, APPROVED for ADMIN
    const approvalStatus = (role === "INTERN" || role === "MENTOR") ? "PENDING" : "APPROVED";

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "INTERN",
        approvalStatus,
        approvedAt: approvalStatus === "APPROVED" ? new Date() : undefined
      }
    });

    return { success: true, message: approvalStatus === "PENDING" ? "Pendaftaran berhasil! Menunggu persetujuan admin." : "Pendaftaran berhasil!" };
  } catch (error: unknown) {
    console.error("Error during registration:", error);
    return { error: "Terjadi kesalahan sistem saat mendaftar." };
  }
}

export async function loginAction(formData: { email: string; password: string }) {
  // Ambil IP — x-forwarded-for di-set Vercel/proxy, fallback "127.0.0.1"
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";

  // Cek rate limit via Upstash Redis (persist antar request & cold start)
  const { success, reset } = await loginRatelimit.limit(ip);
  if (!success) {
    const minutes = Math.ceil((reset - Date.now()) / 60_000);
    return {
      error: `Terlalu banyak percobaan login. Akses diblokir selama ${minutes} menit.`,
      rateLimited: true,
    };
  }

  // Verifikasi credentials via NextAuth
  try {
    await signIn("credentials", {
      email: formData.email,
      password: formData.password,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      const cause = (error.cause as { err?: Error } | undefined)?.err?.message;
      if (cause) return { error: cause };
      return { error: "Email atau password yang Anda masukkan salah." };
    }
    // NEXT_REDIRECT: session sudah di-set, anggap berhasil
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
      return { success: true };
    }
    // Semua exception lain — jangan throw ke client, return error generik
    console.error("[loginAction] unexpected error:", error);
    return { error: "Email atau password yang Anda masukkan salah." };
  }
}
