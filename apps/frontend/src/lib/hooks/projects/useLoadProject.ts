"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { useProjectsStore } from "@/store/project.store";
import type { Project } from "@/lib/types/types";

export const useLoadProject = (projectId?: string | null) => {
  const projects = useProjectsStore((s) => s.projects);
  const addProject = useProjectsStore((s) => s.addProject);

  const cached = projectId ? projects.find((p) => p.id === projectId) : undefined;
  const [project, setProject] = useState<Project | null | undefined>(cached ?? null);
  const [loading, setLoading] = useState<boolean>(!cached && !!projectId);

  useEffect(() => {
    if (!projectId) return;
    
    if (cached) {
      setProject(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const load = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/projects/project/${projectId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        const json = await res.json().catch(() => null);
        const p = json?.data?.project ?? json?.data ?? json;
        if (!cancelled && p) {
          setProject(p as Project);
          try { addProject?.(p as Project); } catch {}
        }
      } catch (err) {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [projectId, cached, addProject]);

  return { project, loading };
};