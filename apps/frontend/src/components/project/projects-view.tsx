"use client";

import { SparkleIcon } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { MOD_KEY_CODES } from "@/lib/keyboard";
import { useKeyboardShortcut } from "@/lib/hooks/useKeyboardShortcut";
import { BrandPageShell } from "@/components/layout/brand-page-shell";
import { ProjectsList } from "./projects-list";
import { useCallback, useState } from "react";
import { ProjectsCommandDialog } from "./projects-commands-dialog";
import { ProjectActionCard } from "./project-action-card";
import { Navbar } from "../layout/navbar";

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
      <BrandPageShell showBrand={true} contentClassName="gap-4">
        <div className="flex w-full flex-col gap-4">
          {githubSection}

          <section className="flex flex-col gap-2">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Get started
            </span>

            <div className="grid grid-cols-2 items-stretch gap-3">
              <ProjectActionCard
                icon={SparkleIcon}
                title="New"
                description="Start a blank project"
                shortcut="J"
                onClick={() => {}}
              />
              <ProjectActionCard
                icon={FaGithub}
                title="Import"
                description="From GitHub repository"
                shortcut="I"
                onClick={() => {}}
              />
            </div>
          </section>

          <ProjectsList onViewAll={() => setCommandDialogOpen(true)} />
        </div>
      </BrandPageShell>
    </>
  );
};
