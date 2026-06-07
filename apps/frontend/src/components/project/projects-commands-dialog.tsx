import { useRouter } from "next/navigation";
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
import { useProjectsStore } from "@/store/project.store";

interface ProjectsCommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProjectsCommandDialog = ({
  open,
  onOpenChange,
}: ProjectsCommandDialogProps) => {
  const router = useRouter();
  const { projects } = useProjectsStore();

  const handleSelect = (projectId: string) => {
    router.push(`/project/${projectId}`);
    onOpenChange(false);
  };

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
        </CommandList>
      </Command>
    </CommandDialog>
  );
};