"use client";

import Link from "next/link";
import { useState } from "react";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { deleteProject, updateProjectName } from "@/lib/api/apis/projects";
import { useProjectsStore } from "@/store/project.store";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types/types";

interface ProjectItemProps {
  data: Project;
  className?: string;
}

export const ProjectItem = ({
  data,
  className,
}: ProjectItemProps) => {
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(data.name);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleRename = async () => {
    const trimmed = nameValue.trim();

    if (!trimmed || trimmed === data.name) {
      setEditing(false);
      return;
    }

    setSaving(true);

    try {
      const res = await updateProjectName(data.id, trimmed);

      if (!res.success) {
        throw new Error(res.message || "Failed to rename project");
      }

      useProjectsStore.getState().updateProject({ ...data, name: trimmed });
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename project");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);

    try {
      const res = await deleteProject(data.id);

      if (!res.success) {
        throw new Error(res.message || "Failed to delete project");
      }

      useProjectsStore.getState().removeProject(data.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete project");
    } finally {
      setDeleteLoading(false);
      setDeleting(false);
    }
  };

  return (
    <li className={className}>
      <div
        className={cn(
          "group flex h-7 w-full items-center rounded-sm p-0 pr-2 ring-1 ring-transparent text-left whitespace-nowrap",
          "text-[13.5px] font-[450] tracking-[-0.01em]",
          "transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          "text-muted-foreground hover:bg-foreground/[0.06] hover:text-sidebar-foreground hover:ring-border/50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        )}
      >
        <Link
          href={`/project/${data.id}`}
          className="flex h-full min-w-0 flex-1 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <div className="min-w-0 flex-1 pl-2">
            <p className="truncate text-[13.5px] font-[450] text-foreground">
              {data.name}
            </p>
          </div>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="Project options"
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md",
                  "opacity-0 transition-[opacity,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  "group-hover:opacity-100 group-focus-within:opacity-100",
                  "hover:bg-foreground/[0.06] dark:hover:bg-white/[0.06]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  "aria-expanded:opacity-100"
                )}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            }
          />

          <DropdownMenuContent align="end" sideOffset={4}>
            <DropdownMenuItem onClick={() => { setNameValue(data.name); setEditing(true); }}>
              <Pencil className="size-4" />
              Edit name
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}>
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
          </DialogHeader>

          <Input
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
            }}
            placeholder="Project name"
            autoFocus
          />

          <DialogFooter>
            <DialogClose render={<Button variant="ghost" size="sm" />}>
              Cancel
            </DialogClose>
            <Button
              size="sm"
              onClick={handleRename}
              disabled={saving || !nameValue.trim()}
            >
              {saving ? <Spinner className="size-3.5" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{data.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The project and its contents will be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? <Spinner className="size-3.5" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
};