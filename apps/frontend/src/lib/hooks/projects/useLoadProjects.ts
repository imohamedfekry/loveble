"use client";

import { useEffect, useRef } from "react";
import { getProjects, type GetProjectsParams } from "@/lib/api/apis/projects";
import { useProjectsStore } from "@/store/project.store";
import { socket } from "@/lib/socket/socket";

export const useLoadProjects = (params?: GetProjectsParams) => {
  const setProjects = useProjectsStore((s) => s.setProjects);
  const setLoading = useProjectsStore((s) => s.setLoading);

  const recent = params?.recent;
  const page = params?.page;
  const limit = params?.limit;

  const requestIdRef = useRef(0);
  const loadAttemptRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const requestId = ++requestIdRef.current;

    const load = async () => {
      const hasCachedProjects =
        useProjectsStore.getState().projects.length > 0;

      try {
        if (!hasCachedProjects) {
          setLoading(true);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        try {
          const response = await getProjects({ recent, page, limit, signal: controller.signal });

          if (cancelled || requestId !== requestIdRef.current) {
            return;
          }

          if (response.success && Array.isArray(response.data?.items)) {
            setProjects(response.data.items);
          } else {
            console.warn("[useLoadProjects] Invalid response:", response);
          }
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error: any) {
        if (!cancelled && requestId === requestIdRef.current) {
          const message = error?.name === 'AbortError'
            ? 'Projects load timed out'
            : error?.message || 'Failed to load projects';
          console.error(`[useLoadProjects] ${message}:`, error);
        }
      } finally {
        if (!cancelled && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    load();
    loadAttemptRef.current++;

    const onConnect = () => {
      if (!cancelled && requestId === requestIdRef.current) {
        const { projects } = useProjectsStore.getState();
        if (projects.length === 0) {
          console.log("[useLoadProjects] Socket connected, attempting to reload projects");
          load();
        }
      }
    };

    socket.on("connect", onConnect);

    return () => {
      cancelled = true;
      socket.off("connect", onConnect);
    };
  }, [setProjects, setLoading, page, limit, recent]);
};

