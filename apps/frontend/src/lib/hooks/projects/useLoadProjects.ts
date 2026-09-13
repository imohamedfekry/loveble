"use client";

import { useEffect } from "react";
import { getProjects, type GetProjectsParams } from "@/lib/api/apis/projects";
import { useProjectsStore } from "@/store/project.store";

type LoadProjectsOptions = GetProjectsParams & { enabled?: boolean };

type ProjectsResult = Awaited<ReturnType<typeof getProjects>>;

// Module-level inflight map: concurrent mounts for the same key
// (StrictMode double-effect, or two layouts mounted together) share
// one network request instead of firing duplicates.
const inflight = new Map<string, Promise<ProjectsResult>>();

const keyOf = (recent?: boolean, page?: number, limit?: number) =>
  `recent:${recent ? 1 : 0}|page:${page ?? ""}|limit:${limit ?? ""}`;

export const useLoadProjects = (params?: LoadProjectsOptions) => {
  const setProjects = useProjectsStore((s) => s.setProjects);
  const setLoading = useProjectsStore((s) => s.setLoading);
  const markLoadedRecent = useProjectsStore((s) => s.markLoadedRecent);
  const markLoadedAll = useProjectsStore((s) => s.markLoadedAll);

  const recent = params?.recent;
  const page = params?.page;
  const limit = params?.limit;
  const enabled = params?.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;

    const state = useProjectsStore.getState();

    // "all" request: only the full list satisfies it; skip if already loaded.
    if (!recent && !page && !limit) {
      if (state.hasLoadedAll) return;
    }

    // "recent" request: skip if already loaded OR if all is loaded
    // (all is a superset — recent data is already in the store).
    if (recent) {
      if (state.hasLoadedRecent || state.hasLoadedAll) return;
    }

    let cancelled = false;

    const load = async () => {
      const needsSkeleton =
        useProjectsStore.getState().projects.length === 0;
      if (needsSkeleton) {
        setLoading(true);
      }

      const key = keyOf(recent, page, limit);
      let promise = inflight.get(key);
      if (!promise) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const fresh = getProjects({
          recent,
          page,
          limit,
          signal: controller.signal,
        });
        inflight.set(key, fresh);
        const cleanup = () => {
          clearTimeout(timeoutId);
          if (inflight.get(key) === fresh) {
            inflight.delete(key);
          }
        };
        fresh.then(cleanup, cleanup);
        promise = fresh;
      }

      try {
        const response = await promise;
        if (cancelled) return;

        if (response.success && Array.isArray(response.data?.items)) {
          // CRITICAL: if all is already loaded (or loading), never let
          // a recent response overwrite the full list.
          const current = useProjectsStore.getState();
          if (recent && current.hasLoadedAll) {
            // All data is already in store — just mark recent as loaded.
            markLoadedRecent();
          } else {
            setProjects(response.data.items);
            if (recent) {
              markLoadedRecent();
            } else if (!page && !limit) {
              markLoadedAll();
            }
          }
        } else {
          console.warn("[useLoadProjects] Invalid response:", response);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          const name = error instanceof Error ? error.name : undefined;
          const message =
            error instanceof Error ? error.message : "Failed to load projects";
          const resolved =
            name === "AbortError" ? "Projects load timed out" : message;
          console.error(`[useLoadProjects] ${resolved}:`, error);
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
  }, [
    setProjects,
    setLoading,
    markLoadedRecent,
    markLoadedAll,
    page,
    limit,
    recent,
    enabled,
  ]);
};
