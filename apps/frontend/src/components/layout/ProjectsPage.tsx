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
    <div className="flex h-full flex-1 flex-col bg-projects-bg py-1.5 pr-1.5">
      <header className="flex shrink-0 items-center justify-between border-b border-projects-border bg-projects-surface/80 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <LayoutGridIcon className="h-5 w-5 text-projects-muted" />
          <h1 className="text-lg font-semibold text-projects-foreground">Projects</h1>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-projects-muted">
            {filteredProjects.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNewProject}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            New project
          </button>
        </div>
      </header>

      <nav className="flex shrink-0 gap-1 px-6 pt-4">
        {TABS.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            href={`/projects${id !== "all" ? `/${id}` : ""}`}
            className={cn(
              "relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              tab === id
                ? "bg-white/10 text-projects-foreground"
                : "text-projects-muted hover:bg-white/5 hover:text-projects-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <main className="flex min-h-0 flex-1 overflow-auto">
        {loading && projects.length === 0 ? (
          <div className="flex w-full flex-col items-center justify-center py-20 text-projects-muted">
            <Spinner className="h-6 w-6" />
            <p className="mt-4 text-sm text-projects-muted">
              Loading projects…
            </p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex w-full items-center justify-center py-20">
            <Empty>
              <EmptyHeader>
                <EmptyMedia
                  variant="icon"
                  className="bg-white/10 text-projects-foreground"
                >
                  <FolderGit2Icon />
                </EmptyMedia>
                <EmptyTitle className="text-projects-foreground">
                  {tab === "all" ? "No projects yet" : `No ${tab} projects`}
                </EmptyTitle>
                <EmptyDescription className="text-projects-muted">
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
              <ProjectItem key={project.id} data={project} variant="onDark" />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
