"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { useProjectsStore } from "@/store/project.store";
import type { Project } from "@loveble/types";

// Module-level: StrictMode double-effect (or two components asking for
// the same project) shares one GET /projects/project/:id request.
const inflightById = new Map<string, Promise<Project>>();

async function fetchProject(projectId: string): Promise<Project> {
  const existing = inflightById.get(projectId);
  if (existing) return existing;

  const promise = (async () => {
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
      if (!p || !p.id) {
        throw new Error("Invalid project data");
      }
      return p as Project;
    } finally {
      clearTimeout(timeoutId);
    }
  })();

  inflightById.set(projectId, promise);
  const cleanup = () => {
    if (inflightById.get(projectId) === promise) {
      inflightById.delete(projectId);
    }
  };
  promise.then(cleanup, cleanup);
  return promise;
}

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

  const [prevCached, setPrevCached] = useState(cached);

  if (prevCached !== cached) {
    setPrevCached(cached);
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
        const p = await fetchProject(projectId);

        if (!cancelled) {
          setProject(p);
          setLoadedId(projectId);
          setError(null);
          try {
            addProject?.(p);
          } catch (err) {
            console.error("[useLoadProject] Error adding to store:", err);
          }
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
