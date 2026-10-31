"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getAssignedInternsWithDetail() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const assignments = await prisma.mentorIntern.findMany({
    where: { mentorId: session.user.id },
    include: {
      intern: {
        include: {
          internEvaluation: true,
          certificate: true,
          applications: {
            where: { status: "ACCEPTED" },
            include: { program: true },
            take: 1
          },
          logbooks: {
            orderBy: { date: "desc" },
            take: 5
          }
        }
      }
    }
  });

  return assignments.map((a) => a.intern);
}

export async function getAssignedInterns() {
  const session = await auth();
  if (!session?.user?.id) return [];

  // Fetch all assigned interns
  const assignments = await prisma.mentorIntern.findMany({
    where: { mentorId: session.user.id },
    include: {
      intern: {
        include: {
          internEvaluation: true,
          certificate: true
        }
      }
    }
  });

  return assignments.map((a) => a.intern);
}

export async function submitEvaluationAction(formData: {
  internId: string;
  technicalScore: number;
  attitudeScore: number;
  communicationScore: number;
  attendanceScore: number;
  notes: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Anda harus login terlebih dahulu." };
    }

    const {
      internId,
      technicalScore,
      attitudeScore,
      communicationScore,
      attendanceScore,
      notes
    } = formData;

    if (!internId) return { error: "ID intern tidak valid." };

    const finalScore =
      (technicalScore + attitudeScore + communicationScore + attendanceScore) / 4;

    // Save evaluation — upsert agar tidak error jika submit ulang
    await prisma.evaluation.upsert({
      where: { internId },
      update: {
        technicalScore,
        attitudeScore,
        communicationScore,
        attendanceScore,
        finalScore,
        notes
      },
      create: {
        internId,
        mentorId: session.user.id,
        technicalScore,
        attitudeScore,
        communicationScore,
        attendanceScore,
        finalScore,
        notes
      }
    });

    // Auto generate Certificate — cek existing dulu agar tidak crash P2002 saat re-submit
    const existingCert = await prisma.certificate.findUnique({
      where: { userId: internId }
    });

    if (!existingCert) {
      const certCount = await prisma.certificate.count();
      const seq = String(certCount + 1).padStart(4, "0");
      const certNumber = `LEXA-INT-2026-0401-${seq}`;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://sh-03-internship-system.vercel.app";
      const verifyUrl = `${appUrl}/verify/${certNumber}`;
      await prisma.certificate.create({
        data: { userId: internId, certNumber, verifyUrl }
      });
    }

    revalidatePath("/mentor/evaluation");
    revalidatePath("/intern/certificate");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error submitting evaluation:", error);
    return { error: "Gagal menyimpan evaluasi nilai." };
  }
}

export async function updateEvaluationAction(formData: {
  internId: string;
  technicalScore: number;
  attitudeScore: number;
  communicationScore: number;
  attendanceScore: number;
  notes: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Anda harus login terlebih dahulu." };
    }

    const {
      internId,
      technicalScore,
      attitudeScore,
      communicationScore,
      attendanceScore,
      notes
    } = formData;

    if (!internId) return { error: "ID intern tidak valid." };

    const finalScore =
      (technicalScore + attitudeScore + communicationScore + attendanceScore) / 4;

    await prisma.evaluation.update({
      where: { internId },
      data: {
        technicalScore,
        attitudeScore,
        communicationScore,
        attendanceScore,
        finalScore,
        notes
      }
    });

    revalidatePath("/mentor/evaluation");
    revalidatePath("/intern/progress");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error updating evaluation:", error);
    return { error: "Gagal memperbarui evaluasi nilai." };
  }
}
