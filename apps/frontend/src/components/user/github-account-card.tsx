"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGithubAccount } from "./hooks/useGithubAccount";
import { GithubConnectButton } from "./github-connect-button";
import { surfacePanelClassName } from "@/lib/styles";
import { useUserStore } from "@/store/user.store";
import { cn } from "@/lib/utils";
import { useSettings } from "@/components/settings/use-settings";
import { Settings } from "lucide-react";
import { Badge } from "../ui/badge";

export function GithubAccountCard() {
  const { github, connectGithub } = useGithubAccount();
  const { openSettings } = useSettings();
  const user = useUserStore((s) => s.user);
  const isLoading = useUserStore((s) => s.isLoading);

  const fallback =
    github?.username?.slice(0, 2).toUpperCase() ??
    user?.username?.slice(0, 2).toUpperCase() ??
    "GH";

  if (isLoading) {
    return (
      <div className={cn(surfacePanelClassName, "relative")}>
        <Skeleton className="absolute top-2 right-2 h-8 w-8 rounded-md" />
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-full" />

          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(surfacePanelClassName, "relative")}>
      {github && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 size-8"
          onClick={() => openSettings("account", "profile")}
        >
          <Settings className="size-4" />
        </Button>
      )}

      <div className="flex items-center gap-3">
        <Avatar size="lg">
          <AvatarImage src={github?.avatar_url ?? undefined} />
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          {github ? (
            <>
              <p className="truncate text-sm font-semibold">
                Hello,{" "}{github.displayName?.trim().split(/\s+/)[0] || github.username}
              </p>
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 hover:bg-green-500/10">
                Github Connected
              </Badge>
            </>
          ) : (
            <>
                              <Badge variant="secondary" className="bg-red-500/10 text-red-600 hover:bg-red-500/10">
                Github Disconnected
              </Badge>
            </>
          )}
        </div>
      </div>

      {!github && (
        <GithubConnectButton onClick={connectGithub} />
        
      )}
    </div>
  );
}