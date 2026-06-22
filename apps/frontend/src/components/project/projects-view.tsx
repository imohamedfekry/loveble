"use client";

import { SparkleIcon } from "lucide-react";
import { Poppins } from "next/font/google";
import { ShortcutKbd } from "../ui/shortcut-kbd";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { actionCardClassName } from "@/lib/styles";
import { MOD_KEY_CODES } from "@/lib/keyboard";
import { useKeyboardShortcut } from "@/lib/hooks/useKeyboardShortcut";
import { FaGithub } from "react-icons/fa";
import { ProjectsList } from "./projects-list";
import { useCallback, useState } from "react";
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

  const toggleCommandDialog = useCallback(() => {
    setCommandDialogOpen((open) => !open);
  }, []);

  useKeyboardShortcut(MOD_KEY_CODES.K, toggleCommandDialog);

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
                  <ShortcutKbd keyLetter="J" />
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
                  <ShortcutKbd keyLetter="I" />
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
