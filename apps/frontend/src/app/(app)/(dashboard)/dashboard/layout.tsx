"use client";

import { useState } from "react";

import { ConnectionLoading } from "@/components/layout/connection-loading";
import { AppSidebar } from "@/components/layout/sidebar/AppSidebar";
import { useLoadProjects } from "@/lib/hooks/projects/useLoadProjects";
import { useProjectsStore } from "@/store/project.store";
import { useUserStore } from "@/store/user.store";
import DashboardSkeleton from "@/components/layout/Skeleton/DashboardSkeleton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Dashboard only needs recents (sidebar shows first 5).
  // Skips automatically if recents — or the full list — are already loaded.
  useLoadProjects({ recent: true });

  const userLoading = useUserStore((s) => s.isLoading);
  const projectsLoading = useProjectsStore((s) => s.loading);
  const projectsCount = useProjectsStore((s) => s.projects.length);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isInitialLoading =
    (userLoading || (projectsLoading && projectsCount === 0));

  return (
    <>
        {/* <DashboardSkeleton/> */}

      {isInitialLoading ? (
        <DashboardSkeleton/>
      ) : (
        <div className="flex h-screen bg-background">
          <AppSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
          <main className="flex min-w-0 flex-1 flex-col bg-sidebar overflow-hidden ">
            <div className="flex min-h-0 flex-1 flex-col overflow-auto ">
              {children}
            </div>
          </main>
        </div>
      )}
    </>
  );
}