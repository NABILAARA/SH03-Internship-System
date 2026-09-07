"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/admin/internship-programs");
  revalidatePath("/intern/internship-registration");
  revalidatePath("/internship-information");
}

export async function getPrograms() {
  return await prisma.internshipProgram.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { applications: true } } }
  });
}

export async function createProgramAction(data: {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
}) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") return { error: "Unauthorized" };
    if (!data.title) return { error: "Judul program wajib diisi." };

    await prisma.internshipProgram.create({
      data: {
        title: data.title,
        description: data.description,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate:   data.endDate   ? new Date(data.endDate)   : null,
        status: data.status || "published"
      }
    });

    revalidateAll();
    return { success: true };
  } catch (error) {
    console.error("Error creating program:", error);
    return { error: "Gagal membuat program magang." };
  }
}

export async function updateProgramAction(
  id: string,
  data: { title: string; description: string; startDate: string; endDate: string; status: string }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") return { error: "Unauthorized" };
    if (!data.title) return { error: "Judul program wajib diisi." };

    await prisma.internshipProgram.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate:   data.endDate   ? new Date(data.endDate)   : null,
        status: data.status
      }
    });

    revalidateAll();
    return { success: true };
  } catch (error) {
    console.error("Error updating program:", error);
    return { error: "Gagal memperbarui program magang." };
  }
}

export async function deleteProgramAction(id: string) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") return { error: "Unauthorized" };

    await prisma.internshipProgram.delete({ where: { id } });

    revalidateAll();
    return { success: true };
  } catch (error) {
    console.error("Error deleting program:", error);
    return { error: "Gagal menghapus program magang." };
  }
}
