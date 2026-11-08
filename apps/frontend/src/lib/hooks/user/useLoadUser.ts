"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useUserStore,
  isUserLoaded,
  markUserLoaded,
  resetUserLoaded,
} from "@/store/user.store";
import { getMe } from "@/lib/api/index";

// Module-level: a second mount (React StrictMode double-effect, or a
// sibling layout mounting) awaits the same promise instead of firing
// a second GET /user/@me.
let inflightUserPromise: Promise<unknown> | null = null;

export const useLoadUser = () => {
  const setUser = useUserStore((s) => s.setUser);
  const finishLoading = useUserStore((s) => s.finishLoading);

  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (isUserLoaded() && useUserStore.getState().user) {
      finishLoading();
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        if (!inflightUserPromise) {
          inflightUserPromise = getMe().finally(() => {
            inflightUserPromise = null;
          });
        }
        const user = await inflightUserPromise;

        if (!cancelled) {
          markUserLoaded();
          setUser(user as Parameters<typeof setUser>[0]);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error && err.message
              ? err.message
              : "Failed to load your account.",
          );
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
  }, [setUser, finishLoading, attempt]);

  const retry = useCallback(() => {
    resetUserLoaded();
    setError(null);
    useUserStore.setState({ isLoading: true });
    setAttempt((value) => value + 1);
  }, []);

  return { error, retry };
};
