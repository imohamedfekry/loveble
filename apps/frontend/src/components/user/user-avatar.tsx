"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { SettingsIcon, LogOutIcon } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { useUserStore } from "@/store/user.store";
import { useGithubAccount } from "./hooks/useGithubAccount";

const triggerClassName =
  "cursor-pointer rounded-full outline-none border-none bg-transparent p-0 ring-2 ring-transparent transition-all hover:opacity-90 hover:ring-border/50";

export function UserAvatarButton() {
  const user = useUserStore((s) => s.user);
  const { github, connectGithub } = useGithubAccount();

  const avatarUrl =
    github?.avatar_url ??
    user?.oauthAccounts.find((acc) => acc.avatar_url)?.avatar_url ??
    null;
  const fallback = user?.username?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className={triggerClassName}>
            <Avatar>
              {avatarUrl && <AvatarImage src={avatarUrl} alt={user?.username} />}
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-3 pb-2 font-normal">
            <Avatar className="size-8">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={user?.username} />}
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">
                {user?.username ?? "User"}
              </span>
              <span className="text-xs text-muted-foreground">
                {user?.email ?? ""}
              </span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {github ? (
            <DropdownMenuLabel className="flex items-center gap-2 font-normal">
              <FaGithub className="size-4" />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm">GitHub Connected</span>
                <span className="text-xs text-muted-foreground">
                  {github.providerId}
                </span>
              </div>
            </DropdownMenuLabel>
          ) : (
            <DropdownMenuItem onClick={connectGithub}>
              <FaGithub className="size-4" />
              Connect GitHub
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem>
            <SettingsIcon className="size-4" />
            Manage account
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive">
            <LogOutIcon className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
