import { Metadata } from "next";
import { ProjectsPage } from "@/components/layout/ProjectsPage";

export const metadata: Metadata = {
  title: "Projects | Loveble",
};

export default function ProjectsPageRoute() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <ProjectsPage params={{ tab: "all" }} />
    </div>
  );
}
