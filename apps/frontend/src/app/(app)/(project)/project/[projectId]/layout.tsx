import { ProjectIdLayout } from "@/components/project/project-id-layout";
import { ProjectSplitLayout } from "../../../../../components/project/project-split-layout";

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <ProjectIdLayout key={projectId} projectId={projectId}>
      <ProjectSplitLayout>
        {children}
      </ProjectSplitLayout>
    </ProjectIdLayout>
  );
}