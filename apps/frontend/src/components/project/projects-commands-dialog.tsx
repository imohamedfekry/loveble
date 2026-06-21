import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ProjectIcon } from "./project.item";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getProjects } from "@/lib/api/projects";
import type { Project } from "@/lib/types/types";

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
        <CommandInput placeholder="Search projects..." />
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