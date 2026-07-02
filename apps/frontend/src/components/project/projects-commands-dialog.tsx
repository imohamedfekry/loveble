import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ProjectIcon } from "./project.item";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getProjects } from "@/lib/api/projects";
import type { Project } from "@/lib/types/types";
import { InputGroup, InputGroupAddon } from "../ui/input-group";
import { SearchIcon } from "lucide-react";
import { Command as CommandPrimitive } from "cmdk"

interface ProjectsCommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProjectsCommandDialog = ({
  open,
  onOpenChange,
}: ProjectsCommandDialogProps) => {
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [isFetching, setIsFetching] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handleSelect = (projectId: string) => {
    router.push(`/project/${projectId}`);
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) return;

    // reset when opening
    setProjects([]);
    setPage(1);
    setHasMore(true);

    const loadFirst = async () => {
      setIsFetching(true);
      try {
        const res = await getProjects({ page: 1, limit });
        if (res.success) {
          setProjects(res.data.items);
          setPage((prev) => prev + 1);
          setHasMore(res.data.pagination.page < res.data.pagination.totalPages);
        }
      } catch (e) {
        console.error("Projects search load failed", e);
      } finally {
        setIsFetching(false);
      }
    };

    loadFirst();
  }, [open, limit]);

  useEffect(() => {
    if (!open || !sentinelRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && hasMore && !isFetching) {
          // fetch next page
          setIsFetching(true);
          getProjects({ page, limit })
            .then((res) => {
              if (res.success) {
                setProjects((prev) => [...prev, ...res.data.items]);
                setPage((p) => p + 1);
                setHasMore(res.data.pagination.page < res.data.pagination.totalPages);
              }
            })
            .catch((e) => console.error("Error loading more projects", e))
            .finally(() => setIsFetching(false));
        }
      });
    });

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [open, page, limit, hasMore, isFetching]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search Projects"
      description="Search and navigate to your projects"
    >
      <Command>
        <InputGroup className="flex justify-between h-8! rounded-lg! border-input/30 bg-input/30 shadow-none! *:data-[slot=input-group-addon]:ps-2!">

          <InputGroupAddon>
            <SearchIcon className="size-4 shrink-0 opacity-50" />

          <CommandPrimitive.Input
            placeholder="Search projects..."
            className="w-full text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
          />
          </InputGroupAddon>
          <kbd className="inline-flex h-5 items-center rounded-md border bg-background px-1.5 text-[10px] font-medium text-muted-foreground mr-1">
            ESC
          </kbd>
        </InputGroup>
        <CommandList>
          <CommandEmpty>No projects found.</CommandEmpty>
          <CommandGroup heading="Projects">
            {projects?.map((project) => (
              <CommandItem
                key={project.id}
                value={`${project.name}-${project.id}`}
                onSelect={() => handleSelect(project.id)}
              >
                <ProjectIcon status={project.importStatus} />
                <span>{project.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <div ref={sentinelRef} />
        </CommandList>
      </Command>
    </CommandDialog>
  );
};