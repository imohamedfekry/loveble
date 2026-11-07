"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  PlusIcon,
  StarIcon,
  UsersRoundIcon,
} from "lucide-react";

import { Button } from "@loveble/ui/button";

import type { LucideIcon } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  FolderLibraryIcon,
  User03Icon,
} from "@hugeicons/core-free-icons";

import { cn } from "@loveble/utils";
import { useProjectsStore } from "@/store/project.store";
import { ProjectItem } from "@/components/layout/sidebar/project.item";
import { ProjectItemSkeleton } from "@/components/layout/sidebar/project-item.skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@loveble/ui/empty";
import { Spinner } from "@loveble/ui/spinner";

type FilterTab = "all" | "starred" | "created" | "shared";

const TABS: { id: FilterTab; label: string; icon: LucideIcon | any }[] = [
  { id: "all", label: "All projects", icon: FolderLibraryIcon },
  { id: "starred", label: "Starred", icon: StarIcon },
  { id: "created", label: "Created by me", icon: User03Icon },
  { id: "shared", label: "Shared with me", icon: UsersRoundIcon },
];


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
    <div className="flex h-full flex-1 flex-col bg-background">
      <header className="shrink-0 border-b border-border/70 px-6 pt-7 pb-4 md:px-9">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] leading-[1.1] font-semibold tracking-[-0.03em] md:text-[32px]">
              Projects
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Everything you have built, in one warm place.
            </p>
          </div>

          <Button
            onClick={handleNewProject}
            className="gap-1.5 shadow-[0_1px_2px_rgba(28,28,28,0.12)]"
          >
            <PlusIcon className="size-4" />
            New project
          </Button>
        </div>

        <nav className="mt-6 inline-flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-border bg-muted p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <Link
              key={id}
              href={`/projects${id !== "all" ? `/${id}` : ""}`}
              className={cn(
                "relative flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-0",
                tab === id
                  ? "bg-card text-foreground shadow-[0_0_0_1px_var(--border),0_1px_2px_rgba(28,28,28,0.06)]"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
              )}
            >
              {Array.isArray(Icon) ? (
                <HugeiconsIcon icon={Icon} className="h-3.5 w-3.5" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
              {label}
            </Link>
          ))}
        </nav>
      </header>

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
                  className="karlek-mark rounded-xl text-white"
                >
                  <HugeiconsIcon icon={FolderLibraryIcon} className="h-5 w-5" />
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
          <div className="w-full px-6 py-6 md:px-9">
            <ul className="w-full max-w-4xl space-y-0.5 rounded-2xl border border-border bg-card p-1.5 shadow-(--karlek-shadow-card)">
              {filteredProjects.map((project) => (
                <ProjectItem key={project.id} data={project} />
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
