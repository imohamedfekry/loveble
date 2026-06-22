"use client";

import { SparkleIcon } from "lucide-react";
import { ShortcutKbd } from "../ui/shortcut-kbd";
import { Button } from "../ui/button";
import { actionCardClassName } from "@/lib/styles";
import { MOD_KEY_CODES } from "@/lib/keyboard";
import { useKeyboardShortcut } from "@/lib/hooks/useKeyboardShortcut";
import { BrandHeader } from "@/components/layout/brand-header";
import { BrandPageShell } from "@/components/layout/brand-page-shell";
import { FaGithub } from "react-icons/fa";
import { ProjectsList } from "./projects-list";
import { useCallback, useState } from "react";
import { ProjectsCommandDialog } from "./projects-commands-dialog";

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
      <BrandPageShell contentClassName="gap-4">
          {/* <BrandHeader className="mb-2" /> */}

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
      </BrandPageShell>
    </>
  );
};
