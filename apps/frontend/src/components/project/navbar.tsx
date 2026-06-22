"use client";

import Image from "next/image";
import Link from "next/link";
import { Poppins } from "next/font/google";
import { useEffect, useState } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { useLoadProject } from "@/lib/hooks/projects/useLoadProject";
import { updateProjectName } from "@/lib/api/projects";
import { cn } from "@/lib/utils";
import { UserAvatarButton } from "../user/user-avatar";
import { CloudCheckIcon, LoaderIcon } from "lucide-react";
import { TooltipContent, TooltipTrigger, Tooltip } from "../ui/tooltip";
import { formatDistanceToNow } from "date-fns";

const font = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export function Navbar({ projectId }: { projectId: string }) {
  const { project, loading } = useLoadProject(projectId);

  const projectName = project?.name ?? "";

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    setName(projectName);
  }, [projectName]);

  const handleSave = async () => {
    const trimmed = name.trim();

    if (!trimmed) {
      setName(projectName);
      setIsEditing(false);
      return;
    }

    if (trimmed === projectName) {
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);

      await updateProjectName(projectId, trimmed);

      // لو useLoadProject فيه refetch استدعيه هنا
      // await refetch();

      setIsEditing(false);
    } catch (error) {
      console.error(error);

      setName(projectName);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(projectName);
    setIsEditing(false);
  };

  return (
    <nav className="flex items-center justify-between gap-x-2 border-b border-border/50 bg-sidebar/80 px-3 py-2 backdrop-blur-md">
      <div className="flex items-center gap-x-2">
        <Breadcrumb>
          <BreadcrumbList className="gap-0!">
            <BreadcrumbItem>
              <BreadcrumbLink
                className="flex items-center gap-1.5"
                render={
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-1.5"
                  >
                    <Image
                      src="/logo.svg"
                      alt="Logo"
                      width={20}
                      height={20}
                    />

                    <span
                      className={cn(
                        "text-sm font-medium",
                        font.className
                      )}
                    >
                      Squadra
                    </span>
                  </Link>
                }
              />
            </BreadcrumbItem>

            <BreadcrumbSeparator className="ml-0! mr-1" />

            <BreadcrumbItem>
              <div className="relative">
                {isEditing ? (
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSave();
                      }

                      if (e.key === "Escape") {
                        handleCancel();
                      }
                    }}
                    className="h-7 w-56 rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                ) : (
                  <div
                    onDoubleClick={() => {
                      if (!loading && projectName) {
                        setName(projectName);
                        setIsEditing(true);
                      }
                    }}
                    className="relative cursor-text rounded px-1 py-0.5"
                    title="Double click to rename"
                  >
                    <BreadcrumbPage className="max-w-40 truncate text-sm font-medium">
                      {projectName ||
                        (loading
                          ? "Loading..."
                          : "Unknown project")}
                    </BreadcrumbPage>

                    {isSaving && (
                      <div className="absolute inset-0 rounded bg-emerald-500/20 backdrop-blur-[1px] animate-pulse" />
                    )}
                  </div>

                )}
              </div>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {project?.importStatus === "importing" && (
          <Tooltip>
            <TooltipTrigger>
              <LoaderIcon className="size-4 text-muted-foreground animate-spin" />
            </TooltipTrigger>

            <TooltipContent>
              Importing...
            </TooltipContent>
          </Tooltip>
        )}

        {project?.importStatus !== "importing" && (
          <Tooltip>
            <TooltipTrigger>
              <CloudCheckIcon className="size-4 text-muted-foreground" />
            </TooltipTrigger>

            <TooltipContent>
              {project?.updatedAt ? (
                <>
                  Saved{" "}
                  {formatDistanceToNow(
                    new Date(project.updatedAt),
                    { addSuffix: true }
                  )}
                </>
              ) : (
                "Saved"
              )}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="flex items-center gap-2">
        <UserAvatarButton />
      </div>
    </nav>
  );
}