import { createPageMetadata } from "@/utils/create-page-metadata";
import { UserListContainer } from "@/features/admin/components/user-list-container";
import { getUsersByRole } from "@/features/admin/services/user-management.actions";
import { getPrograms } from "@/features/internship-programs/services/program.actions";

export const metadata = createPageMetadata("Interns");

export default async function InternsPage() {
  const [internResult, mentorResult, programsResult] = await Promise.all([
    getUsersByRole("INTERN"),
    getUsersByRole("MENTOR"),
    getPrograms(),
  ]);

  const users = (internResult.data || []) as Parameters<typeof UserListContainer>[0]["initialData"];

  const mentors = (mentorResult.data || [])
    .filter((m) => m.approvalStatus === "APPROVED")
    .map((m) => ({ id: m.id, name: m.name, email: m.email }));

  const programs = (Array.isArray(programsResult) ? programsResult : []).map((p) => ({
    id: p.id,
    title: p.title,
    startDate: p.startDate ?? null,
    endDate: p.endDate ?? null,
  }));

  return (
    <UserListContainer
      initialData={users}
      role="INTERN"
      roleLabel="Intern"
      mentors={mentors}
      programs={programs}
    />
  );
}
