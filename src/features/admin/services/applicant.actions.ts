"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { sendApprovalEmail, sendRejectionEmail, sendSelectionSessionEmail } from "@/services/email";
import {
  ApplicationStatus,
  SelectionMethod,
  SelectionSessionStatus,
  SelectionSessionType,
} from "@prisma/client";

const adminOnly = async () => {
  const session = await auth();
  return session?.user?.role === "ADMIN" ? session : null;
};

function revalidateApplicationViews() {
  revalidatePath("/admin/applicants");
  revalidatePath("/admin/interns");
  revalidatePath("/admin/google-drive-interns");
  revalidatePath("/admin/dashboard");
  revalidatePath("/intern/internship-registration");
  revalidatePath("/mentor/assigned-interns");
}

export async function getAllApplications() {
  if (!(await adminOnly())) return [];

  return prisma.application.findMany({
    include: {
      user: {
        select: {
          id: true, name: true, email: true, role: true,
          // Informasi Pribadi
          nickname: true, phone: true, gender: true,
          birthPlace: true, birthDate: true,
          address: true, city: true, province: true,
          // Pendidikan
          institution: true, faculty: true, studyProgram: true,
          studentId: true, semester: true, entryYear: true, graduationYear: true,
          // Skill & Portfolio
          portfolioUrl: true, linkedinUrl: true, githubUsername: true,
          skills: true, bio: true,
          organizationExperience: true, workExperience: true,
        }
      },
      program: true,
      selectionSessions: {
        include: { interviewer: { select: { id: true, name: true, email: true } } },
        orderBy: { scheduledAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateApplicationStatusAction(
  applicationId: string,
  status: ApplicationStatus,
  reviewNotes?: string,
) {
  const session = await adminOnly();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const application = await prisma.application.update({
      where: { id: applicationId },
      data: { status, notes: reviewNotes?.trim() || undefined },
      include: { user: true },
    });

    if (status === "ACCEPTED") {
      // Reuse the applicant account; never create a second user.
      // Copy position dari application ke internshipPosition user
      await prisma.user.update({
        where: { id: application.userId },
        data: {
          role: "INTERN",
          approvalStatus: "APPROVED",
          internshipPosition: application.position ?? undefined,
        },
      });

      const assignment = await prisma.mentorIntern.findUnique({ where: { internId: application.userId } });
      if (!assignment) {
        const mentor = await prisma.user.findFirst({
          where: { role: "MENTOR", approvalStatus: "APPROVED" },
          orderBy: { createdAt: "asc" },
        });
        if (mentor) {
          await prisma.mentorIntern.create({ data: { internId: application.userId, mentorId: mentor.id } });
        }
      }
      sendApprovalEmail(application.user.email, application.user.name ?? "Peserta").catch(console.error);
    }

    if (status === "REJECTED") {
      sendRejectionEmail(application.user.email, application.user.name ?? "Peserta", reviewNotes).catch(console.error);
    }

    revalidateApplicationViews();
    return { success: true };
  } catch (error) {
    console.error("Error updating application status:", error);
    return { error: "Gagal memperbarui status pendaftaran." };
  }
}

export async function createSelectionSessionAction(data: {
  applicationId: string;
  title: string;
  type: SelectionSessionType;
  scheduledAt: string;
  method: SelectionMethod;
  location?: string;
  meetingLink?: string;
  interviewerName?: string;
  notes?: string;
}) {
  const session = await adminOnly();
  if (!session?.user?.id) return { error: "Unauthorized" };
  if (!data.title.trim() || !data.scheduledAt) return { error: "Judul dan jadwal seleksi wajib diisi." };
  if (data.method === "ONLINE" && data.meetingLink && !URL.canParse(data.meetingLink)) {
    return { error: "Link meeting tidak valid." };
  }

  try {
    const [createdSession] = await prisma.$transaction([
      prisma.selectionSession.create({
        data: {
          applicationId: data.applicationId,
          title: data.title.trim(),
          type: data.type,
          scheduledAt: new Date(data.scheduledAt),
          method: data.method,
          location: data.location?.trim() || null,
          meetingLink: data.meetingLink?.trim() || null,
          interviewerId: session.user.id,
          interviewerName: data.interviewerName?.trim() || null,
          notes: data.notes?.trim() || null,
        },
      }),
      prisma.application.update({
        where: { id: data.applicationId },
        data: { status: data.type.includes("INTERVIEW") ? "INTERVIEW" : "IN_REVIEW" },
      }),
    ]);

    // Kirim email notifikasi ke applicant
    const application = await prisma.application.findUnique({
      where: { id: data.applicationId },
      select: {
        position: true,
        user: { select: { name: true, email: true } },
        program: { select: { title: true } },
      },
    });

    if (application?.user?.email) {
      sendSelectionSessionEmail(
        application.user.email,
        application.user.name ?? "Peserta",
        {
          title: createdSession.title,
          type: createdSession.type,
          scheduledAt: createdSession.scheduledAt,
          method: createdSession.method,
          location: createdSession.location,
          meetingLink: createdSession.meetingLink,
          interviewerName: createdSession.interviewerName,
          notes: createdSession.notes,
        },
        application.program.title,
        application.position
      ).catch(err => console.error("Failed to send selection session email:", err));
    }

    revalidateApplicationViews();
    return { success: true };
  } catch (error) {
    console.error("Error creating selection session:", error);
    return { error: "Gagal menambahkan sesi seleksi." };
  }
}

export async function updateSelectionSessionAction(data: {
  id: string;
  status: SelectionSessionStatus;
  score?: number | null;
  resultNotes?: string;
  scheduledAt?: string;
}) {
  if (!(await adminOnly())) return { error: "Unauthorized" };
  try {
    await prisma.selectionSession.update({
      where: { id: data.id },
      data: {
        status: data.status,
        score: data.score ?? null,
        resultNotes: data.resultNotes?.trim() || null,
        ...(data.scheduledAt ? { scheduledAt: new Date(data.scheduledAt) } : {}),
      },
    });
    revalidateApplicationViews();
    return { success: true };
  } catch (error) {
    console.error("Error updating selection session:", error);
    return { error: "Gagal memperbarui sesi seleksi." };
  }
}

// Compatibility wrapper for existing consumers while moving to the structured status enum.
export async function reviewApplicationAction(applicationId: string, status: "approved" | "rejected", reviewNotes?: string) {
  return updateApplicationStatusAction(applicationId, status === "approved" ? "ACCEPTED" : "REJECTED", reviewNotes);
}
