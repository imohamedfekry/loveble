"use client";

import { SparkleIcon } from "lucide-react"
import { Poppins } from "next/font/google"
import { Kbd } from "../ui/kbd"
import { Button } from "../ui/button"
import { cn } from "@/lib/utils"
import { FaGithub } from "react-icons/fa"
import { ProjectsList } from './projects-list'
import { useEffect, useState } from "react";
import { ProjectsCommandDialog } from "./projects-commands-dialog";
const font = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
})

export const ProjectsView = () => {
  const [commandDialogOpen, setCommandDialogOpen] = useState(false);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandDialogOpen((open) => !open);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    }
  }), [];
  return (
    <>
      <ProjectsCommandDialog
        open={commandDialogOpen}
        onOpenChange={setCommandDialogOpen}
      />
      <div className="min-h-screen flex flex-col items-center justify-center bg-sidebar p-6 mb-p-16">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center">

          <div className="flex items-center gap-2 w-full group/logo mb-5">
            <img src="/logo.svg" alt="Polaris" className="size-[32px] md:size-[46px]" />
            <h1 className={cn(
              "text-4xl md:text-5xl font-semibold",
              font.className,
            )}>
              Squadra
            </h1>
          </div>



          <div className="flex flex-col gap-4 w-full">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => { }} className="items-start justify-start h-full p-4 bg-background border flex flex-col gap-6 rounded-none
">
                <div className="flex items-center justify-between w-full">
                  <SparkleIcon className="size-4 text-primary" />
                  <Kbd className="bg-accent border">Ctrl + J</Kbd>
                </div>
                <span className="text-sm">
                  New
                </span>
              </Button>
              <Button variant="outline" onClick={() => { }} className="items-start justify-start h-full p-4 bg-background border flex flex-col gap-6 rounded-none
">
                <div className="flex items-center justify-between w-full">
                  <FaGithub className="size-4 text-primary" />
                  <Kbd className="bg-accent border">Ctrl + I</Kbd>
                </div>
                <span className="text-sm">
                  Import
                </span>
              </Button>
            </div>

            <ProjectsList onViewAll={() => setCommandDialogOpen(true)} />

          </div>
        </div>
      </div>
    </>
  );
}