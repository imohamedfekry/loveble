"use client";

import { useProjectRealtime } from "@/lib/socket/hooks/useProjectRealtime";
import { ProjectNavbar } from "./project-navbar";
import { useLoadUser } from "@/lib/hooks/user/useLoadUser";
import { useRealtimeProjects } from "@/lib/socket/hooks/useRealtimeProjects";

export const ProjectIdLayout = ({
  children,
  projectId,
}: {
  children: React.ReactNode;
  projectId: string;
}) => {
  useLoadUser();
  useProjectRealtime(projectId)
  useRealtimeProjects();

  return (
    <div className="flex h-screen w-full flex-col">
      <ProjectNavbar projectId={projectId} />
      <div className="flex flex-1 overflow-hidden">{children}</div>
    </div>
  );
};