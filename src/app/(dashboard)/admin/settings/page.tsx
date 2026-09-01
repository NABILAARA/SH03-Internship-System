import { createPageMetadata } from "@/utils/create-page-metadata";
import { PageHeader } from "@/components/shared/page-header";
import { AdminSettings } from "@/features/admin/components/admin-settings";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export const metadata = createPageMetadata("Settings");

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true
    }
  });

  if (!admin) redirect("/login");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Informasi akun admin dan konfigurasi sistem"
      />
      <AdminSettings admin={admin} nodeEnv={process.env.NODE_ENV ?? "development"} />
    </div>
  );
}
