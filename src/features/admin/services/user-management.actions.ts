"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { UserRole } from "@/types/roles";
import { hashPassword } from "@/utils/hash";

export async function getUsersByRole(role: UserRole) {
  try {
    const session = await auth();
    
    // Only admin can view users
    if (!session?.user || session.user.role !== "ADMIN") {
      return { error: "Unauthorized" };
    }

    const users = await prisma.user.findMany({
      where: {
        role,
        approvalStatus: { not: "REJECTED" },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        approvalStatus: true,
        createdAt: true,
        approvedAt: true,
        googleDriveRegistered: true,
        googleDriveFolderUrl: true,
        googleDriveFolderId: true,
        googleDriveRegisteredAt: true,
        googleDriveRegisteredBy: true,
        institution: true,
        studyProgram: true,
        internshipStatus: true,
        // Informasi Pribadi
        nickname: true,
        phone: true,
        gender: true,
        birthPlace: true,
        birthDate: true,
        address: true,
        city: true,
        province: true,
        // Pendidikan
        faculty: true,
        studentId: true,
        semester: true,
        entryYear: true,
        graduationYear: true,
        // Skill & Portfolio
        portfolioUrl: true,
        linkedinUrl: true,
        githubUsername: true,
        skills: true,
        bio: true,
        organizationExperience: true,
        workExperience: true,
        // Informasi Internship
        internshipPosition: true,
        internshipStartDate: true,
        internshipEndDate: true,
        supervisorName: true,
        documentStatus: true,
        applications: {
          select: {
            id: true,
            status: true,
            cvUrl: true,
            createdAt: true,
            program: { select: { title: true } }
          },
          orderBy: { createdAt: "desc" as const },
          take: 1
        },
        certificate: {
          select: { certNumber: true, issuedAt: true }
        },
        internRelation: {
          include: {
            mentor: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        mentorRelations: {
          include: {
            intern: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const data = users.map(({ internRelation, mentorRelations, ...u }) => ({
      ...u,
      assignedMentor: internRelation?.mentor ?? null,
      assignedInterns: mentorRelations.map((r) => r.intern)
    }));

    return { data };
  } catch (error: unknown) {
    console.error(`Error fetching ${role} users:`, error);
    return { error: `Gagal mengambil data ${role}` };
  }
}

export async function addMentorByAdminAction(data: {
  name: string;
  email: string;
  password: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return { error: "Unauthorized" };
    }

    if (!data.name.trim())        return { error: "Nama wajib diisi." };
    if (!data.email.trim())       return { error: "Email wajib diisi." };
    if (!data.password.trim())    return { error: "Password wajib diisi." };
    if (data.password.length < 6) return { error: "Password minimal 6 karakter." };

    const existing = await prisma.user.findUnique({
      where: { email: data.email.trim().toLowerCase() },
    });
    if (existing) return { error: "Email sudah terdaftar." };

    await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: hashPassword(data.password),
        role: "MENTOR",
        approvalStatus: "APPROVED",
        approvedAt: new Date(),
        approvedBy: session.user.id,
      },
    });

    revalidatePath("/admin/mentors");
    revalidatePath("/admin/interns");
    return { success: true };
  } catch (error) {
    console.error("Error adding mentor by admin:", error);
    return { error: "Gagal mendaftarkan mentor." };
  }
}

export async function addInternByAdminAction(data: {
  name: string;
  email: string;
  password: string;
  programId: string;
  position: string;
  mentorId?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return { error: "Unauthorized" };
    }

    // Validasi input
    if (!data.name.trim())     return { error: "Nama wajib diisi." };
    if (!data.email.trim())    return { error: "Email wajib diisi." };
    if (!data.password.trim()) return { error: "Password wajib diisi." };
    if (data.password.length < 6) return { error: "Password minimal 6 karakter." };
    if (!data.programId)       return { error: "Program wajib dipilih." };
    if (!data.position)        return { error: "Posisi wajib dipilih." };

    // Cek email tidak duplikat
    const existing = await prisma.user.findUnique({ where: { email: data.email.trim().toLowerCase() } });
    if (existing) return { error: "Email sudah terdaftar." };

    // Cek program ada
    const program = await prisma.internshipProgram.findUnique({ where: { id: data.programId } });
    if (!program) return { error: "Program tidak ditemukan." };

    const hashed = hashPassword(data.password);

    // Buat user intern langsung APPROVED
    const intern = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: hashed,
        role: "INTERN",
        approvalStatus: "APPROVED",
        approvedAt: new Date(),
        approvedBy: session.user.id,
        internshipPosition: data.position,
      },
    });

    // Buat application langsung ACCEPTED (On Going)
    await prisma.application.create({
      data: {
        userId: intern.id,
        programId: data.programId,
        position: data.position,
        status: "ACCEPTED",
        notes: "Didaftarkan langsung oleh admin.",
      },
    });

    // Assign mentor jika dipilih — kalau tidak, auto-assign mentor pertama
    const mentorId = data.mentorId || (
      await prisma.user.findFirst({
        where: { role: "MENTOR", approvalStatus: "APPROVED" },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      })
    )?.id;

    if (mentorId) {
      await prisma.mentorIntern.create({
        data: { internId: intern.id, mentorId },
      });
    }

    revalidatePath("/admin/interns");
    revalidatePath("/admin/applicants");
    revalidatePath("/admin/dashboard");
    return { success: true, internId: intern.id };
  } catch (error) {
    console.error("Error adding intern by admin:", error);
    return { error: "Gagal mendaftarkan intern." };
  }
}

export async function registerInternGoogleDriveAction(data: { internId: string; folderUrl: string; folderId?: string }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return { error: "Unauthorized" };
  const folderUrl = data.folderUrl.trim();
  if (!folderUrl || !URL.canParse(folderUrl)) return { error: "URL folder Google Drive tidak valid." };
  try {
    await prisma.user.update({
      where: { id: data.internId, role: "INTERN" },
      data: {
        googleDriveRegistered: true,
        googleDriveFolderUrl: folderUrl,
        googleDriveFolderId: data.folderId?.trim() || null,
        googleDriveRegisteredAt: new Date(),
        googleDriveRegisteredBy: session.user.id,
      },
    });
    revalidatePath("/admin/interns");
    revalidatePath("/admin/google-drive-interns");
    return { success: true };
  } catch (error) {
    console.error("Error registering Google Drive folder:", error);
    return { error: "Gagal menyimpan pendaftaran Google Drive." };
  }
}

export async function deleteUser(userId: string) {
  try {
    const session = await auth();
    
    // Only admin can delete users
    if (!session?.user || session.user.role !== "ADMIN") {
      return { error: "Unauthorized" };
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Error deleting user:", error);
    return { error: "Gagal menghapus pengguna" };
  }
}

export async function getMentorInternAssignments() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return { error: "Unauthorized" };
    }

    const interns = await prisma.user.findMany({
      where: {
        role: "INTERN",
        approvalStatus: "APPROVED"
      },
      select: {
        id: true,
        name: true,
        email: true,
        internRelation: {
          include: {
            mentor: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { name: "asc" }
    });

    return { data: interns };
  } catch (error: unknown) {
    console.error("Error fetching mentor-intern assignments:", error);
    return { error: "Gagal mengambil data penugasan mentor" };
  }
}

export async function assignMentorToIntern(internId: string, mentorId: string) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return { error: "Unauthorized" };
    }

    await prisma.mentorIntern.upsert({
      where: { internId },
      update: { mentorId },
      create: { internId, mentorId }
    });

    revalidatePath("/admin/interns");
    revalidatePath("/mentor/assigned-interns");
    revalidatePath("/mentor/evaluation");
    revalidatePath("/mentor/logbook-review");
    return { success: true };
  } catch (error: unknown) {
    console.error("Error assigning mentor to intern:", error);
    return { error: "Gagal menugaskan mentor" };
  }
}

export async function unassignMentorFromIntern(internId: string) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return { error: "Unauthorized" };
    }

    await prisma.mentorIntern.delete({
      where: { internId }
    });

    revalidatePath("/admin/interns");
    revalidatePath("/mentor/assigned-interns");
    revalidatePath("/mentor/evaluation");
    revalidatePath("/mentor/logbook-review");
    return { success: true };
  } catch (error: unknown) {
    console.error("Error unassigning mentor from intern:", error);
    return { error: "Gagal menghapus penugasan mentor" };
  }
}
