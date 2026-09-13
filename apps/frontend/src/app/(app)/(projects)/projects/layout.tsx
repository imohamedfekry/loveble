"use client";

import { ConnectionLoading } from "@/components/layout/connection-loading";
import { AppSidebar } from "@/components/layout/sidebar/AppSidebar";
import { useLoadProjects } from "@/lib/hooks/projects/useLoadProjects";
import { useProjectsStore } from "@/store/project.store";
import { useUserStore } from "@/store/user.store";
import { useState } from "react";

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // /projects needs the full list. The hook skips itself when
  // hasLoadedAll is already true (recents alone don't satisfy it).
  useLoadProjects();

  const userLoading = useUserStore((s) => s.isLoading);
  const projectsLoading = useProjectsStore((s) => s.loading);
  const projectsCount = useProjectsStore((s) => s.projects.length);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isInitialLoading = userLoading || (projectsLoading && projectsCount === 0);

  return (
    <>
      {isInitialLoading ? (
        <ConnectionLoading className="flex-1" message="Loading..." />
      ) : (
        <div className="flex h-screen bg-sidebar">
          <AppSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
          <main className="flex min-w-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col">
              {children}
            </div>
          </main>
        </div>
      )}
    </>
  );
}
