"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getInternApplications() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return await prisma.application.findMany({
    where: { userId: session.user.id },
    include: {
      program: true,
      selectionSessions: {
        orderBy: { scheduledAt: "asc" },
        select: {
          id: true,
          title: true,
          type: true,
          scheduledAt: true,
          method: true,
          location: true,
          meetingLink: true,
          interviewerName: true,
          notes: true,
          status: true,
          score: true,
          resultNotes: true,
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function getPublishedPrograms() {
  return await prisma.internshipProgram.findMany({
    where: { status: "published" },
    orderBy: { createdAt: "desc" }
  });
}

export async function applyForProgramAction(formData: {
  programId: string;
  position: string;
  cvUrl: string;
  notes: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Anda harus login terlebih dahulu." };
    }

    if (!formData.programId) return { error: "Program magang tidak valid." };
    if (!formData.position) return { error: "Posisi yang dilamar wajib dipilih." };
    if (!formData.cvUrl) return { error: "Link CV wajib diisi." };

    const approvedApp = await prisma.application.findFirst({
      where: { userId: session.user.id, status: "ACCEPTED" }
    });
    if (approvedApp) {
      return { error: "Anda sudah diterima di program magang. Tidak dapat mendaftar ke program lain." };
    }

    const existing = await prisma.application.findFirst({
      where: { userId: session.user.id, programId: formData.programId }
    });
    if (existing) {
      return { error: "Anda sudah mendaftar di program magang ini." };
    }

    await prisma.application.create({
      data: {
        userId: session.user.id,
        programId: formData.programId,
        position: formData.position,
        cvUrl: formData.cvUrl,
        notes: formData.notes,
        status: "PENDING"
      }
    });

    revalidatePath("/intern/internship-registration");
    revalidatePath("/admin/applicants");
    return { success: true };
  } catch (error) {
    console.error("Error creating application:", error);
    return { error: "Gagal mengirim pendaftaran magang." };
  }
}

export async function resubmitApplicationAction(formData: {
  applicationId: string;
  position: string;
  cvUrl: string;
  notes: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Anda harus login terlebih dahulu." };
    }

    if (!formData.position) return { error: "Posisi yang dilamar wajib dipilih." };
    if (!formData.cvUrl) return { error: "Link CV wajib diisi." };

    const application = await prisma.application.findFirst({
      where: {
        id: formData.applicationId,
        userId: session.user.id,
        status: "REJECTED"
      }
    });

    if (!application) {
      return { error: "Pendaftaran tidak ditemukan atau tidak dapat dikirim ulang." };
    }

    await prisma.application.update({
      where: { id: formData.applicationId },
      data: {
        position: formData.position,
        cvUrl: formData.cvUrl,
        notes: formData.notes,
        status: "PENDING"
      }
    });

    revalidatePath("/intern/internship-registration");
    revalidatePath("/admin/applicants");
    return { success: true };
  } catch (error) {
    console.error("Error resubmitting application:", error);
    return { error: "Gagal mengirim ulang pendaftaran." };
  }
}
