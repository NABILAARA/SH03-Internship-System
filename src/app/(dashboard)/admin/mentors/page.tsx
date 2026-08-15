import { createPageMetadata } from "@/utils/create-page-metadata";
import { MentorListContainer } from "@/features/admin/components/mentor-list-container";
import { getUsersByRole } from "@/features/admin/services/user-management.actions";
import type { ComponentProps } from "react";

export const metadata = createPageMetadata("Mentors");

export default async function MentorsPage() {
  const mentorResult = await getUsersByRole("MENTOR");
  const mentors = (mentorResult.data || []) as ComponentProps<typeof MentorListContainer>["initialData"];

  return <MentorListContainer initialData={mentors} />;
}
