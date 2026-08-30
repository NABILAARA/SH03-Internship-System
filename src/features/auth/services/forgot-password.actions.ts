"use server";

import { prisma } from "@/lib/db";
import { hashPassword } from "@/utils/hash";
import { sendPasswordResetEmail } from "@/services/email";
import crypto from "crypto";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const TOKEN_EXPIRY_HOURS = 1;

/** Step 1 — User request reset: generate token + kirim email */
export async function forgotPasswordAction(email: string) {
  try {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) return { error: "Email wajib diisi." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return { error: "Format email tidak valid." };
    }

    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
      select: { id: true, name: true, email: true, password: true }
    });

    // Selalu return success meskipun email tidak ditemukan — mencegah email enumeration
    if (!user || !user.password) {
      return { success: true };
    }

    // Invalidate token lama yang belum dipakai
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true }
    });

    // Generate token acak yang kuat
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt }
    });

    const resetUrl = `${APP_URL}/reset-password/${token}`;
    await sendPasswordResetEmail(user.email, user.name ?? "Pengguna", resetUrl);

    return { success: true };
  } catch (error) {
    console.error("[forgotPasswordAction]", error);
    return { error: "Terjadi kesalahan sistem. Coba lagi nanti." };
  }
}

/** Step 2 — Validasi token (dipanggil saat page reset-password di-load) */
export async function validateResetTokenAction(token: string) {
  try {
    if (!token) return { valid: false, error: "Token tidak valid." };

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
      select: { id: true, expiresAt: true, used: true, userId: true }
    });

    if (!record) return { valid: false, error: "Link reset tidak valid." };
    if (record.used) return { valid: false, error: "Link ini sudah digunakan." };
    if (record.expiresAt < new Date()) {
      return { valid: false, error: "Link reset sudah kedaluwarsa. Silakan minta ulang." };
    }

    return { valid: true };
  } catch (error) {
    console.error("[validateResetTokenAction]", error);
    return { valid: false, error: "Terjadi kesalahan sistem." };
  }
}

/** Step 3 — Simpan password baru */
export async function resetPasswordAction(token: string, newPassword: string, confirmPassword: string) {
  try {
    if (!token) return { error: "Token tidak valid." };
    if (!newPassword) return { error: "Password baru wajib diisi." };
    if (newPassword.length < 8) return { error: "Password minimal 8 karakter." };
    if (newPassword !== confirmPassword) return { error: "Konfirmasi password tidak cocok." };

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
      select: { id: true, userId: true, expiresAt: true, used: true }
    });

    if (!record) return { error: "Link reset tidak valid." };
    if (record.used) return { error: "Link ini sudah digunakan." };
    if (record.expiresAt < new Date()) {
      return { error: "Link reset sudah kedaluwarsa. Silakan minta ulang." };
    }

    const hashed = hashPassword(newPassword);

    // Update password + tandai token sebagai used — dalam satu transaksi
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: hashed }
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { used: true }
      })
    ]);

    return { success: true };
  } catch (error) {
    console.error("[resetPasswordAction]", error);
    return { error: "Terjadi kesalahan sistem. Coba lagi nanti." };
  }
}
