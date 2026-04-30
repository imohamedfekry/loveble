"use client";

import { useEffect } from "react";
import { getProjects } from "@/lib/api/projects";
import { useProjectsStore } from "@/store/project.store";

export const useLoadProjects = () => {
  const setProjects = useProjectsStore((s) => s.setProjects);
  const setLoading = useProjectsStore((s) => s.setLoading);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const data = await getProjects();
        setProjects(data?.data?.projects ?? []);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [setProjects, setLoading]);
};