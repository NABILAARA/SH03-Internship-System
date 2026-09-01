"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/utils/hash";
import { revalidatePath } from "next/cache";
import { changeEmailSchema, internProfileSchema } from "../schemas/profile.schema";

export async function getProfileData() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      approvalStatus: true,
      githubUsername: true,
      nickname: true,
      phone: true,
      gender: true,
      birthPlace: true,
      birthDate: true,
      address: true,
      city: true,
      province: true,
      institution: true,
      faculty: true,
      studyProgram: true,
      studentId: true,
      semester: true,
      entryYear: true,
      graduationYear: true,
      portfolioUrl: true,
      linkedinUrl: true,
      skills: true,
      bio: true,
      organizationExperience: true,
      workExperience: true,
      internshipStartDate: true,
      internshipEndDate: true,
      internshipPosition: true,
      internshipStatus: true,
      supervisorName: true,
      documentStatus: true,
      accounts: {
        where: { provider: "github" },
        select: { providerAccountId: true }
      },
      internRelation: {
        select: {
          mentor: {
            select: { name: true }
          }
        }
      }
    }
  });
}

export async function updateInternProfileAction(data: unknown) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "INTERN") return { error: "Tidak berwenang." };
  const parsed = internProfileSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Data profil tidak valid." };

  const value = parsed.data;
  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...value,
        nickname: value.nickname || null,
        phone: value.phone || null,
        gender: value.gender || null,
        birthPlace: value.birthPlace || null,
        birthDate: value.birthDate ? new Date(value.birthDate) : null,
        address: value.address || null,
        city: value.city || null,
        province: value.province || null,
        institution: value.institution || null,
        faculty: value.faculty || null,
        studyProgram: value.studyProgram || null,
        studentId: value.studentId || null,
        portfolioUrl: value.portfolioUrl || null,
        linkedinUrl: value.linkedinUrl || null,
        githubUsername: value.githubUsername?.trim().replace(/^@/, "") || null,
        skills: value.skills || null,
        bio: value.bio || null,
        organizationExperience: value.organizationExperience || null,
        workExperience: value.workExperience || null,
      },
    });
    revalidatePath("/intern/profile");
    revalidatePath("/admin/interns");
    return { success: true };
  } catch (error) {
    console.error("Error updating intern profile:", error);
    return { error: "Gagal memperbarui profil intern." };
  }
}

export async function updateGithubUsernameAction(data: { githubUsername: string }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Tidak terautentikasi." };

    const username = data.githubUsername.trim().replace(/^@/, "");

    // Validate username format (alphanumeric + hyphens, max 39 chars)
    if (username && !/^[a-zA-Z0-9-]{1,39}$/.test(username)) {
      return { error: "Format GitHub username tidak valid." };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { githubUsername: username || null }
    });

    revalidatePath("/mentor/profile");
    revalidatePath("/intern/profile");
    return { success: true };
  } catch (error) {
    console.error("Error updating github username:", error);
    return { error: "Gagal memperbarui GitHub username." };
  }
}

export async function updateProfileAction(data: { name: string }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Tidak terautentikasi." };

    const name = data.name.trim();
    if (!name || name.length < 2) return { error: "Nama minimal 2 karakter." };

    await prisma.user.update({
      where: { id: session.user.id },
      data: { name }
    });

    revalidatePath("/mentor/profile");
    revalidatePath("/intern/profile");
    return { success: true };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { error: "Gagal memperbarui profil." };
  }
}

export async function changeEmailAction(data: {
  newEmail: string;
  currentPassword: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Tidak terautentikasi." };

    // Validate schema (domain check included)
    const parsed = changeEmailSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.errors[0].message };
    }

    const newEmail = data.newEmail.trim().toLowerCase();

    // Verify password before changing email
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true, email: true }
    });

    if (!user?.password) return { error: "Akun tidak memiliki password." };

    const isMatch = verifyPassword(data.currentPassword, user.password);
    if (!isMatch) return { error: "Password salah." };

    if (user.email === newEmail) {
      return { error: "Email baru sama dengan email saat ini." };
    }

    // Check email not taken by another user
    const existing = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existing) return { error: "Email sudah digunakan akun lain." };

    await prisma.user.update({
      where: { id: session.user.id },
      data: { email: newEmail }
    });

    revalidatePath("/mentor/profile");
    revalidatePath("/intern/profile");
    return { success: true };
  } catch (error) {
    console.error("Error changing email:", error);
    return { error: "Gagal mengubah email." };
  }
}

export async function changePasswordAction(data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Tidak terautentikasi." };

    if (data.newPassword !== data.confirmPassword) {
      return { error: "Konfirmasi password tidak cocok." };
    }
    if (data.newPassword.length < 8) {
      return { error: "Password baru minimal 8 karakter." };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true }
    });

    if (!user?.password) return { error: "Akun tidak memiliki password." };

    const isMatch = verifyPassword(data.currentPassword, user.password);
    if (!isMatch) return { error: "Password saat ini salah." };

    const hashed = hashPassword(data.newPassword);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashed }
    });

    return { success: true };
  } catch (error) {
    console.error("Error changing password:", error);
    return { error: "Gagal mengubah password." };
  }
}
