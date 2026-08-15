"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { useProjectsStore } from "@/store/project.store";
import type { Project } from "@/lib/types/types";

export const useLoadProject = (projectId?: string | null) => {
  const projects = useProjectsStore((s) => s.projects);
  const addProject = useProjectsStore((s) => s.addProject);

  const cached = projectId
    ? projects.find((p) => p.id === projectId)
    : undefined;

  const [project, setProject] = useState<Project | null | undefined>(
    cached ?? null,
  );
  const [loadedId, setLoadedId] = useState<string | null>(cached?.id ?? null);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = cached?.id ?? projectId ?? null;
  const [prevCacheKey, setPrevCacheKey] = useState(cacheKey);

  if (prevCacheKey !== cacheKey) {
    setPrevCacheKey(cacheKey);
    if (cached) {
      setProject(cached);
      setLoadedId(cached.id);
      setError(null);
    } else if (projectId) {
      setProject(undefined);
      setLoadedId(null);
      setError(null);
    }
  }

  const loading = !!projectId && loadedId !== projectId && !error;

  useEffect(() => {
    if (!projectId) return;

    if (cached) return;

    let cancelled = false;

    const load = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
          const res = await fetch(
            `${API_BASE_URL}/projects/project/${projectId}`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              signal: controller.signal,
            },
          );

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }

          const json = await res.json().catch(() => null);
          const p = json?.data?.project ?? json?.data ?? json;

          if (!cancelled && p && p.id) {
            setProject(p as Project);
            setLoadedId(projectId);
            setError(null);
            try {
              addProject?.(p as Project);
            } catch (err) {
              console.error("[useLoadProject] Error adding to store:", err);
            }
          } else if (!cancelled) {
            throw new Error("Invalid project data");
          }
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const name = err instanceof Error ? err.name : undefined;
          const message =
            err instanceof Error ? err.message : "Failed to load project";
          const resolved = name === "AbortError" ? "Load timed out" : message;
          console.error(`[useLoadProject] ${resolved}:`, err);
          setError(resolved);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [projectId, cached, addProject]);

  return { project, loading, error };
};
