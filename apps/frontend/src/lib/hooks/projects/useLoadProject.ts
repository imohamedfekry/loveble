"use client";

import { useEffect, useState, useRef } from "react";
import { API_BASE_URL } from "@/lib/api";
import { useProjectsStore } from "@/store/project.store";
import { useEditorStore } from "@/store/use-editor-store";
import { openProject } from "@/lib/api/apis/projects";
import type { Project } from "@loveble/types";

// Module-level: StrictMode double-effect (or two components asking for
// the same project) shares one GET /projects/project/:id request.
const inflightById = new Map<string, Promise<Project>>();
const inflightOpenById = new Map<string, Promise<void>>();

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

/**
 * Make sure the project's environment (E2B sandbox) is ready.
 * - Idempotent: skips when already ready, dedupes concurrent callers.
 * - Updates `useEditorStore.sandboxByProject`: starting → ready | error.
 */
export async function ensureSandbox(projectId: string): Promise<void> {
  const existing = inflightOpenById.get(projectId);
  if (existing) {
    console.log(
      `[sandbox] project ${projectId}: ensure already in-flight — reusing it`,
    );
    return existing;
  }

  const state = useEditorStore.getState().getSandboxState(projectId);
  if (state.status === "starting") return;

  if (state.status === "ready" && state.sandboxId) {
    console.log(
      `[sandbox] project ${projectId}: already ready — sandbox ${state.sandboxId}`,
    );
    return;
  }

  const store = useEditorStore.getState();
  store.setSandboxState(projectId, { status: "starting", error: undefined });
  console.log(`[sandbox] project ${projectId}: starting environment...`);

  const promise = (async () => {
    try {
      const result = await openProject(projectId);

      if (!result.success || !result.sandboxId) {
        throw new Error(result.message || "Failed to start the environment");
      }

      console.log(
        `[sandbox] project ${projectId}: environment ready — ` +
          `${result.created ? "created new" : "reused existing"} ` +
          `sandbox ${result.sandboxId} (state: ${result.status ?? "unknown"})`,
      );

      useEditorStore.getState().setSandboxState(projectId, {
        status: "ready",
        sandboxId: result.sandboxId,
        error: undefined,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to start the environment";

      console.error(
        `[sandbox] project ${projectId}: environment failed — ${message}`,
        err,
      );

      useEditorStore.getState().setSandboxState(projectId, {
        status: "error",
        error: message,
      });
    }
  })();

  inflightOpenById.set(projectId, promise);

  try {
    await promise;
  } finally {
    if (inflightOpenById.get(projectId) === promise) {
      inflightOpenById.delete(projectId);
    }
  }

  return promise;
}

export const useLoadProject = (projectId?: string | null) => {
  const projects = useProjectsStore((s) => s.projects);
  const addProject = useProjectsStore((s) => s.addProject);
  const sandboxState = useEditorStore((s) =>
    projectId ? s.getSandboxState(projectId) : undefined,
  );

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

  useEffect(() => {
    if (!projectId || error) return;

    ensureSandbox(projectId);
  }, [projectId, error]);

  return {
    project,
    loading,
    error,
    sandboxState,
    ensureSandbox: projectId ? () => ensureSandbox(projectId) : undefined,
  };
};
