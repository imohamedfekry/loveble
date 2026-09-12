"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { createProject } from "@/lib/api/apis/projects";
import { useProjectsStore } from "@/store/project.store";
import { cn } from "@/lib/utils";

export function CreateProjectButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    const trimmed = name.trim();

    if (!trimmed || creating) return;

    setCreating(true);

    try {
      const result = await createProject({ name: trimmed });

      if (!result.success || !result.project) {
        throw new Error(result.message || "Failed to create project");
      }

      useProjectsStore.getState().addProject(result.project);

      setOpen(false);
      setName("");

      router.push(`/project/${result.project.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="New project"
              title="New project"
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-[6px] text-muted-foreground",
                "transition-[background-color,color,opacity] duration-200 ease-out",
                "hover:bg-sidebar-nav-hover hover:text-sidebar-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              )}
            >
              <Plus className="size-3.5" />
            </button>
          }
        />
        <TooltipContent>New project</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
          </DialogHeader>

          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            placeholder="Project name"
            autoFocus
          />

          <DialogFooter>
            <DialogClose
              render={<Button variant="ghost" size="sm" />}
              disabled={creating}
            >
              Cancel
            </DialogClose>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={creating || !name.trim()}
            >
              {creating ? <Spinner className="size-3.5" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}