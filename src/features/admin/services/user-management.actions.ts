"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { UserRole } from "@/types/roles";

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
