"use client";

import { ConnectionLoading } from "@/components/layout/connection-loading";
import { useLoadFiles } from "@/lib/hooks/file/useFiles";
import { useProjectRealtime } from "@/lib/socket/hooks/useProjectRealtime";
import { useLoadProject } from "@/lib/hooks/projects/useLoadProject";
import { useLoadUser } from "@/lib/hooks/user/useLoadUser";
import { useRealtimeProjects } from "@/lib/socket/hooks/useRealtimeProjects";
import { ProjectNavbar } from "./project-navbar";

export const ProjectIdLayout = ({
  children,
  projectId,
}: {
  children: React.ReactNode;
  projectId: string;
}) => {
  useLoadUser();
  useLoadFiles(projectId);
  useProjectRealtime(projectId);
  useRealtimeProjects();

  const { loading: projectLoading } = useLoadProject(projectId);

  // Show content once project data is loaded
  // Socket is only for real-time updates, not blocking initial render
  const isReady = !projectLoading;

  return (
    <>
      {!isReady ? (
        <ConnectionLoading
          className="flex-1"
          message="Loading project…"
        />

      )
        : (
          <div className="flex h-screen w-full flex-col">
            <ProjectNavbar projectId={projectId} />
            <div className="flex flex-1 overflow-hidden">
              {children}
            </div>
          </div>
        )}
    </>
  );
};
