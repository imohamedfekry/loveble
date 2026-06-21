"use client";

import { SparkleIcon } from "lucide-react";
import { Poppins } from "next/font/google";
import { Kbd } from "../ui/kbd";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { actionCardClassName } from "@/lib/styles";
import { FaGithub } from "react-icons/fa";
import { ProjectsList } from "./projects-list";
import { useEffect, useState } from "react";
import { ProjectsCommandDialog } from "./projects-commands-dialog";

const font = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const ProjectsView = ({
  githubSection,
}: {
  githubSection?: React.ReactNode;
}) => {
  const [commandDialogOpen, setCommandDialogOpen] = useState(false);

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;

    const isTyping =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable;

    if (isTyping) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setCommandDialogOpen((open) => !open);
    }
  };

  document.addEventListener("keydown", handleKeyDown);

  return () => {
    document.removeEventListener("keydown", handleKeyDown);
  };
}, []);

  return (
    <>
      <ProjectsCommandDialog
        open={commandDialogOpen}
        onOpenChange={setCommandDialogOpen}
      />
      <div className="page-gradient flex min-h-screen flex-col items-center justify-center p-6">
        <div className="mx-auto flex w-full max-w-sm flex-col items-center">
          <div className="group/logo mb-6 flex w-full items-center gap-2.5">
            <img
              src="/logo.svg"
              alt="Squadra"
              className="size-9 transition-transform duration-300 group-hover/logo:scale-105 md:size-11"
            />
            <h1
              className={cn(
                "text-4xl font-semibold tracking-tight md:text-5xl",
                font.className,
              )}
            >
              Squadra
            </h1>
          </div>

          <div className="flex w-full flex-col gap-4">
            {githubSection}

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => {}}
                className={actionCardClassName}
              >
                <div className="flex w-full items-center justify-between">
                  <SparkleIcon className="size-4 text-primary" />
                  <Kbd className="rounded-md border bg-accent/60">Ctrl + J</Kbd>
                </div>
                <span className="text-sm font-medium">New</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => {}}
                className={actionCardClassName}
              >
                <div className="flex w-full items-center justify-between">
                  <FaGithub className="size-4 text-primary" />
                  <Kbd className="rounded-md border bg-accent/60">Ctrl + I</Kbd>
                </div>
                <span className="text-sm font-medium">Import</span>
              </Button>
            </div>

            <ProjectsList onViewAll={() => setCommandDialogOpen(true)} />
          </div>
        </div>
      </div>
    </>
  );
};
