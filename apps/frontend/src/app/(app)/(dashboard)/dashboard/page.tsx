"use client";

import { ProjectsView } from "@/components/project/projects-view";
import { GithubAccountCard } from "@/components/user/github-account-card";

export default function DashboardPage() {
  return (
    <>
      <ProjectsView githubSection={<GithubAccountCard />} />
    </>
  );
}