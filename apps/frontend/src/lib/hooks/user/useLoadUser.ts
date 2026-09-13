"use client";

import { useEffect } from "react";
import { useUserStore, isUserLoaded, markUserLoaded } from "@/store/user.store";
import { getMe } from "@/lib/api/index";

// Module-level: a second mount (React StrictMode double-effect, or a
// sibling layout mounting) awaits the same promise instead of firing
// a second GET /user/@me.
let inflightUserPromise: Promise<unknown> | null = null;

export const useLoadUser = () => {
  const setUser = useUserStore((s) => s.setUser);
  const finishLoading = useUserStore((s) => s.finishLoading);

  useEffect(() => {
    if (isUserLoaded() && useUserStore.getState().user) {
      finishLoading();
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        if (!inflightUserPromise) {
          console.log("[useLoadUser] Loading user...");
          inflightUserPromise = getMe().finally(() => {
            inflightUserPromise = null;
          });
        }
        const data = await inflightUserPromise;

        if (!cancelled) {
          console.log("[useLoadUser] User loaded:", (data as { id?: string })?.id);
          markUserLoaded();
          setUser(data as Parameters<typeof setUser>[0]);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[useLoadUser] Failed to load user:", err);
        }
      } finally {
        if (!cancelled) {
          finishLoading();
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [setUser, finishLoading]);
};
