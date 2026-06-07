"use client";

import { useEffect, useRef } from "react";
import { getProjects, type GetProjectsParams } from "@/lib/api/projects";
import { useProjectsStore } from "@/store/project.store";

export const useLoadProjects = (params?: GetProjectsParams) => {
  const setProjects = useProjectsStore((s) => s.setProjects);
  const setLoading = useProjectsStore((s) => s.setLoading);

  const recent = params?.recent;
  const page = params?.page;
  const limit = params?.limit;

  const requestIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const requestId = ++requestIdRef.current;
    const hasCachedProjects = useProjectsStore.getState().projects.length > 0;

    const load = async () => {
      try {
        if (!hasCachedProjects) {
          setLoading(true);
        }

        const response = await getProjects({ recent, page, limit });
        console.log("Projects API response:", response);
        if (cancelled || requestId !== requestIdRef.current) {
          return;
        }

        if (response.success && Array.isArray(response.data?.items)) {
          setProjects(response.data.items);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error loading projects:", error);
        }
      } finally {
        if (!cancelled && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [setProjects, setLoading, page, limit, recent]);
};
