"use client";

import { useState } from "react";

import { AppSidebar } from "@/components/layout/sidebar/AppSidebar";
import { useLoadProjects } from "@/lib/hooks/projects/useLoadProjects";
import { useProjectsStore } from "@/store/project.store";
import { useUserStore } from "@/store/user.store";
import DashboardSkeleton from "@/components/layout/Skeleton/dashboard/DashboardSkeleton";

function LayoutPreviewToggle({
  skeleton,
  children,
}: {
  skeleton: React.ReactNode;
  children: React.ReactNode;
}) {
  const [showSkeleton, setShowSkeleton] = useState(false);

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-1 rounded-lg border bg-background p-1 shadow-lg">
        <button
          type="button"
          onClick={() => setShowSkeleton(false)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            !showSkeleton
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted"
          }`}
        >
          UI
        </button>

        <button
          type="button"
          onClick={() => setShowSkeleton(true)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            showSkeleton
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted"
          }`}
        >
          Skeleton
        </button>
      </div>

      {showSkeleton ? skeleton : children}
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useLoadProjects({ recent: true });

  const userLoading = useUserStore((s) => s.isLoading);
  const projectsLoading = useProjectsStore((s) => s.loading);
  const projectsCount = useProjectsStore((s) => s.projects.length);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isInitialLoading =
    userLoading || (projectsLoading && projectsCount === 0);

  const dashboard = (
    <div className="flex h-screen bg-background">
      <AppSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-sidebar">
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );

  return (
    // <LayoutPreviewToggle skeleton={<DashboardSkeleton active="dashboard" />}>
    <>
      {isInitialLoading ? <DashboardSkeleton active="dashboard" /> : dashboard}
    
    </>
    // </LayoutPreviewToggle>
  );
}