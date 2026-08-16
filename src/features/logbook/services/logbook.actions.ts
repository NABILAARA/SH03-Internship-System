"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getInternLogbooks() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return await prisma.logbook.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" }
  });
}

export async function createLogbookAction(formData: {
  activity: string;
  progress: number;
  projectProgress: number;
  date?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Anda harus login terlebih dahulu." };
    }

    // Intern must have an assigned mentor before writing logbook
    const mentorAssignment = await prisma.mentorIntern.findUnique({
      where: { internId: session.user.id }
    });
    if (!mentorAssignment) {
      return { error: "Anda belum memiliki mentor. Logbook hanya bisa diisi setelah admin menugaskan mentor kepada Anda." };
    }

    if (!formData.activity) return { error: "Detail aktivitas wajib diisi." };
    if (formData.progress === undefined || formData.progress < 0 || formData.progress > 100) {
      return { error: "Progress harus berada di antara 0% dan 100%." };
    }
    if (formData.projectProgress === undefined || formData.projectProgress < 0 || formData.projectProgress > 100) {
      return { error: "Progress proyek harus berada di antara 0% dan 100%." };
    }

    await prisma.logbook.create({
      data: {
        userId: session.user.id,
        activity: formData.activity,
        progress: formData.progress,
        projectProgress: formData.projectProgress,
        date: formData.date ? new Date(formData.date) : new Date(),
        status: "pending"
      }
    });

    revalidatePath("/intern/logbook");
    revalidatePath("/intern/progress");
    revalidatePath("/mentor/logbook-review");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error creating logbook:", error);
    return { error: "Gagal menyimpan logbook." };
  }
}

export async function getMentorLogbooks() {
  const session = await auth();
  if (!session?.user?.id) return [];

  // Single query: filter logbooks by mentor through relation — no extra round-trip
  return await prisma.logbook.findMany({
    where: {
      user: {
        internRelation: { mentorId: session.user.id }
      }
    },
    include: { user: true },
    orderBy: { date: "desc" }
  });
}

export async function resubmitLogbookAction(formData: {
  logbookId: string;
  activity: string;
  progress: number;
  projectProgress: number;
  date?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Anda harus login terlebih dahulu." };
    }

    if (!formData.activity) return { error: "Detail aktivitas wajib diisi." };
    if (formData.progress < 0 || formData.progress > 100) {
      return { error: "Progress harus berada di antara 0% dan 100%." };
    }
    if (formData.projectProgress < 0 || formData.projectProgress > 100) {
      return { error: "Progress proyek harus berada di antara 0% dan 100%." };
    }

    // Verify the logbook belongs to this user and is rejected
    const logbook = await prisma.logbook.findFirst({
      where: {
        id: formData.logbookId,
        userId: session.user.id,
        status: "rejected"
      }
    });

    if (!logbook) {
      return { error: "Logbook tidak ditemukan atau tidak dapat dikirim ulang." };
    }

    await prisma.logbook.update({
      where: { id: formData.logbookId },
      data: {
        activity: formData.activity,
        progress: formData.progress,
        projectProgress: formData.projectProgress,
        date: formData.date ? new Date(formData.date) : logbook.date,
        status: "pending",
        feedback: null
      }
    });

    revalidatePath("/intern/logbook");
    revalidatePath("/intern/progress");
    revalidatePath("/mentor/logbook-review");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error resubmitting logbook:", error);
    return { error: "Gagal mengirim ulang logbook." };
  }
}

export async function reviewLogbookAction(
  logbookId: string,
  status: "approved" | "rejected",
  feedback?: string
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    // Verify the logbook belongs to one of this mentor's interns
    const assignment = await prisma.mentorIntern.findFirst({
      where: {
        mentorId: session.user.id,
        intern: { logbooks: { some: { id: logbookId } } }
      }
    });
    if (!assignment) return { error: "Forbidden" };

    await prisma.logbook.update({
      where: { id: logbookId },
      data: {
        status,
        feedback
      }
    });

    revalidatePath("/intern/logbook");
    revalidatePath("/intern/progress");
    revalidatePath("/mentor/logbook-review");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error reviewing logbook:", error);
    return { error: "Gagal menyimpan review logbook." };
  }
}
