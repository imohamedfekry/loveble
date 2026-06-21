"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGithubAccount } from "./hooks/useGithubAccount";
import { GithubConnectButton } from "./github-connect-button";
import { surfacePanelClassName } from "@/lib/styles";
import { useUserStore } from "@/store/user.store";

export function GithubAccountCard() {
  const { github, connectGithub } = useGithubAccount();
  const user = useUserStore((s) => s.user);
  const fallback = user?.username?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <div className={surfacePanelClassName}>
      <div className="flex items-center gap-3">
        <Avatar size="lg">
          {github?.avatar_url && (
            <AvatarImage src={github.avatar_url} alt="GitHub avatar" />
          )}
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>

        <div>
          <p className="text-sm font-medium">
            {github ? "GitHub Connected" : "GitHub Not Connected"}
          </p>
          {/* {github && (
            <p className="text-xs text-muted-foreground">{github.providerId}</p>
          )} */}
        </div>
      </div>

      {!github && <GithubConnectButton onClick={connectGithub} />}
    </div>
  );
}
