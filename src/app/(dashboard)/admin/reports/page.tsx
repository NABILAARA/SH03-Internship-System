import { createPageMetadata } from "@/utils/create-page-metadata";
import { AdminReportsNew } from "@/features/admin/components/admin-reports-new";
import { getReportsData } from "@/features/admin/services/reports.actions";

export const metadata = createPageMetadata("Reports");

const emptyData = {
  summary: {
    totalInterns: 0,
    totalCertificates: 0,
    totalLogbooks: 0,
    totalMentors: 0,
    completionRate: 0,
  },
  internStatus: { ongoing: 0, upcoming: 0, completed: 0 },
  programSummary: [],
  logbookSummary: { total: 0, approved: 0, pending: 0, rejected: 0, avgProjectProgress: 0 },
  certificateList: [],
  mentorData: [],
  pendingRegistrations: [],
  registrationHistory: [],
};

export default async function ReportsPage() {
  try {
    const result = await getReportsData();
    if ("error" in result || !result.data) {
      return <AdminReportsNew {...emptyData} />;
    }
    return <AdminReportsNew {...result.data} />;
  } catch {
    return <AdminReportsNew {...emptyData} />;
  }
}
