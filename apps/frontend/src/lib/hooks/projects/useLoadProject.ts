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
  const [loading, setLoading] = useState<boolean>(!cached && !!projectId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    if (cached) {
      setProject(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

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
      } catch (err: any) {
        if (!cancelled) {
          const message = err?.name === 'AbortError' 
            ? 'Load timed out' 
            : err?.message || 'Failed to load project';
          console.error(`[useLoadProject] ${message}:`, err);
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
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
