"use client";

import { useEffect } from "react";
import { useUserStore } from "@/store/user.store";
import { getMe } from "@/lib/api/index";

export const useLoadUser = () => {
  const setUser = useUserStore((s) => s.setUser);
  const finishLoading = useUserStore((s) => s.finishLoading);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        console.log("[useLoadUser] Loading user...");
        const data = await getMe();
        
        if (!cancelled) {
          console.log("[useLoadUser] User loaded:", data?.id);
          setUser(data);
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