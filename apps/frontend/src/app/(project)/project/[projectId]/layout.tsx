import { ProjectIdLayout } from "@/components/project/project-id-layout";

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <ProjectIdLayout projectId={projectId}>
      {children}
    </ProjectIdLayout>
  );
}