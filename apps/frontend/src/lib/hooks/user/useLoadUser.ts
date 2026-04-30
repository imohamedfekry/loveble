"use client";

import { useEffect } from "react";
import { useUserStore } from "@/store/user.store";
import { getMe } from "../../api/user";

export const useLoadUser = () => {
  const setUser = useUserStore((s) => s.setUser);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getMe();
        setUser(data);
      } catch (err) {
        console.error("failed to load user", err);
      }
    };

    load();
  }, [setUser]);
};