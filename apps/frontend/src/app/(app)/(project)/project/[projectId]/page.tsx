"use client";
import { ProjectIdView } from "@/components/project/project-id-view";

export default async function ProjectPage({params}: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  return <ProjectIdView projectId={projectId} />;
}
