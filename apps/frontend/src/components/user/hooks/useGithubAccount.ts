"use client";

import { useCallback } from "react";
import { redirectToGithubConnect } from "@/lib/api/auth";
import { useUserStore } from "@/store/user.store";

export function useGithubAccount() {
  const user = useUserStore((s) => s.user);

  const github =
    user?.oauthAccounts.find((acc) => acc.provider === "github") ?? null;

  const connectGithub = useCallback(() => {
    redirectToGithubConnect();
  }, []);

  return { github, connectGithub };
}
