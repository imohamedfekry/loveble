"use client";

import { useEffect } from "react";

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

  const { project, loading: projectLoading } = useLoadProject(projectId);

  useEffect(() => {
    const expected = project?.name ? `${project.name} | Loveble` : "Loveble";

    const apply = () => {
      if (document.title !== expected) {
        document.title = expected;
      }
    };

    apply();

    // Next.js re-applies route metadata during client-side navigation,
    // so keep re-applying our title whenever the <title> changes.
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [project?.name]);

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
          <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background">
            {/* Ambient brand glow like the dashboard */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `
                  radial-gradient(ellipse 70% 45% at 50% -10%, rgb(75 115 255 / 14%), transparent 70%),
                  radial-gradient(ellipse 45% 35% at 95% 0%, rgb(255 102 244 / 7%), transparent 70%),
                  radial-gradient(ellipse 45% 35% at 5% 0%, rgb(130 188 255 / 9%), transparent 70%)
                `,
              }}
            />
            <ProjectNavbar projectId={projectId} />
            <div className="relative flex min-h-0 flex-1 overflow-hidden">
              {children}
            </div>
          </div>
        )}
    </>
  );
};
