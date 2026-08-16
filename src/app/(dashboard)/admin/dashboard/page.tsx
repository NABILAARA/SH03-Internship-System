import { createPageMetadata } from "@/utils/create-page-metadata";
import { getDashboardStats } from "@/features/admin/services/dashboard.actions";
import dynamic from "next/dynamic";

const AdminDashboard = dynamic(
  () => import("@/features/admin/components/admin-dashboard").then((mod) => mod.AdminDashboard)
);

export const metadata = createPageMetadata("Admin Dashboard");

const emptyData = {
  totalApplicants: 0,
  totalInterns: 0,
  activeInterns: 0,
  completedInterns: 0,
  totalCertificates: 0,
  pendingApprovals: 0,
  totalMentors: 0,
  pendingLogbooks: 0,
  internsWithoutMentor: 0,
  internsNotEvaluated: 0,
  latestApplications: [],
  internChartData: [],
  programPieData: [],
  upcomingSchedule: []
};

export default async function AdminDashboardPage() {
  try {
    const result = await getDashboardStats();
    const dashboardData = result.data ?? emptyData;
    return <AdminDashboard initialData={dashboardData} />;
  } catch {
    // DB timeout atau server error — render dengan empty data, tidak crash
    return <AdminDashboard initialData={emptyData} />;
  }
}
