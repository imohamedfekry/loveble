"use client";

import { Navbar } from "@/components/layout/navbar";
import { useLoadProjects } from "@/lib/hooks/projects/useLoadProjects";
import { useRealtimeProjects } from "@/lib/hooks/projects/useRealtimeProjects";
import { useLoadUser } from "@/lib/hooks/user/useLoadUser";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useLoadUser();
  useLoadProjects({ recent: true });
  useRealtimeProjects();

  return <>
    <div className="flex h-screen flex-col">
      <Navbar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  </>;
}
