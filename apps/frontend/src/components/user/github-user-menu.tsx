"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserOAuthAccount } from "@/lib/types/types";

const triggerClassName =
  "cursor-pointer outline-none border-none bg-transparent p-0 hover:opacity-80 transition-opacity";

type Props = {
  account: UserOAuthAccount;
};

export function GithubUserMenu({ account }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className={triggerClassName}>
            <Avatar>
              {account.avatar_url && (
                <AvatarImage src={account.avatar_url} alt="GitHub avatar" />
              )}
              <AvatarFallback>GH</AvatarFallback>
            </Avatar>
          </button>
        }
      />

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-3 font-normal">
          <Avatar className="size-8">
            {account.avatar_url && (
              <AvatarImage src={account.avatar_url} alt="GitHub avatar" />
            )}
            <AvatarFallback>GH</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">GitHub Connected</span>
            {/* <span className="text-xs text-muted-foreground">
              {account.providerId}
            </span> */}
          </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
