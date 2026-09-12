"use client";

import { SparkleIcon } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { BrandPageShell } from "@/components/layout/brand-page-shell";
import { ProjectsList } from "@/components/layout/sidebar/projects-list";
import { ProjectActionCard } from "./project-action-card";

export const ProjectsView = ({
  githubSection,
}: {
  githubSection?: React.ReactNode;
}) => {
  return (
    <>
      <BrandPageShell
        showBrand={true}
        variant="fill"
        contentClassName="w-full gap-4"
      >
        <div className="flex w-full flex-col gap-4">
          {githubSection}

          <section className="flex flex-col gap-2">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase text-balance">
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

          <ProjectsList />
        </div>
      </BrandPageShell>
    </>
  );
};
