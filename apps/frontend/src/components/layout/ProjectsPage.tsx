"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FolderGit2Icon,
  StarIcon,
  UserIcon,
  UsersIcon,
  LayoutGridIcon,
  PlusIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useProjectsStore } from "@/store/project.store";
import { ProjectItem } from "@/components/layout/sidebar/project.item";
import { ProjectItemSkeleton } from "@/components/layout/sidebar/project-item.skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import type { Project } from "@/lib/types/types";

type FilterTab = "all" | "starred" | "created" | "shared";

const TABS: { id: FilterTab; label: string; icon: React.ElementType }[] = [
  { id: "all", label: "All projects", icon: FolderGit2Icon },
  { id: "starred", label: "Starred", icon: StarIcon },
  { id: "created", label: "Created by me", icon: UserIcon },
  { id: "shared", label: "Shared with me", icon: UsersIcon },
];

import { useParams } from "next/navigation";

export function ProjectsPage({ params: _params }: { params: { tab?: string } }) {
  const router = useRouter();
  const params = useParams();
  const projects = useProjectsStore((s) => s.projects);
  const loading = useProjectsStore((s) => s.loading);
  const tab = (params.tab as FilterTab) || "all";

  const filteredProjects = useMemo(() => {
    switch (tab) {
      case "starred":
        return projects.filter((p) => p.importStatus === "completed");
      case "created":
        return projects.filter((p) => p.importStatus !== "failed");
      case "shared":
        return projects.filter((p) => p.importStatus === "completed");
      default:
        return projects;
    }
  }, [tab, projects]);

  const handleNewProject = () => {
    router.push("/dashboard");
  };

  return (
    <div className="flex h-full flex-1 flex-col bg-muted rounded-2xl">
      <nav className="flex shrink-0 gap-1 px-6 pt-3">
        {TABS.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            href={`/projects${id !== "all" ? `/${id}` : ""}`}
            className={cn(
              "relative flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
              tab === id
                ? "bg-card text-foreground"
                : "text-muted-foreground hover:bg-card/50 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <main className="flex min-h-0 flex-1 overflow-auto">
        {loading && projects.length === 0 ? (
          <div className="flex w-full flex-col items-center justify-center py-20 text-muted-foreground">
            <Spinner className="h-6 w-6" />
            <p className="mt-4 text-sm text-muted-foreground">
              Loading projects…
            </p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex w-full items-center justify-center py-20">
            <Empty>
              <EmptyHeader>
                <EmptyMedia
                  variant="icon"
                  className="bg-card text-foreground"
                >
                  <FolderGit2Icon />
                </EmptyMedia>
                <EmptyTitle className="text-foreground">
                  {tab === "all" ? "No projects yet" : `No ${tab} projects`}
                </EmptyTitle>
                <EmptyDescription className="text-muted-foreground">
                  {tab === "all"
                    ? "Create your first project to get started"
                    : `You don't have any ${tab} projects`}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <ul className="w-full max-w-3xl space-y-1 px-6 py-4">
            {filteredProjects.map((project) => (
              <ProjectItem key={project.id} data={project} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
