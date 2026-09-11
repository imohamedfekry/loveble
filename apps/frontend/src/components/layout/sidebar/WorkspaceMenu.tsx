"use client";

import { useState } from "react";
import { CheckIcon, ChevronDown, LogOutIcon, SettingsIcon } from "lucide-react";
import { FaGithub } from "react-icons/fa";

import { useGithubAccount } from "@/components/user/hooks/useGithubAccount";
import { useSettings } from "@/components/settings/use-settings";
import { useUserStore } from "@/store/user.store";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";

import { cn } from "@/lib/utils";
import { AvatarImage } from "./AvatarImage";
import { CollapseLabel } from "./CollapseLabel";

export function WorkspaceMenu({ open }: { open: boolean }) {
  const { github, connectGithub } = useGithubAccount();
  const user = useUserStore((s) => s.user);
  const { openSettings } = useSettings();
  const [menuOpen, setMenuOpen] = useState(false);

  const avatarUrl = github?.avatar_url;
  const displayName = (github?.displayName || user?.username || "User").split(
    " "
  )[0];
  const fullName = github?.displayName || user?.username || "User";
  const email = user?.email ?? "";

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger
        render={
          <button
            aria-label="Open workspace menu"
            aria-expanded={menuOpen}
            className={cn(
              "group relative flex h-8 w-full items-center rounded-lg p-0 text-left ring-1",
              "text-[13.5px] font-[450] tracking-[-0.01em]",
              "transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-0",
              menuOpen
                ? "bg-foreground/[0.06] dark:bg-white/[0.06] ring-border/50 dark:ring-white/10 text-sidebar-foreground shadow-sm"
                : "ring-border/40 dark:ring-white/10 text-muted-foreground hover:bg-foreground/[0.06] hover:text-sidebar-foreground hover:ring-border/50 dark:hover:bg-white/[0.06] dark:hover:ring-white/10"
            )}
          >
            {/* Avatar — ثابت 32×32 في النص بدون حركة */}
            <span className="flex h-8 w-8 shrink-0 items-center justify-center">
              <AvatarImage
                src={null}
                alt={displayName}
                className="h-5.5 w-5.5 shrink-0 rounded-sm object-cover text-[10px]"
              />
            </span>
            <CollapseLabel
              open={open}
              className="min-w-0 flex-1 truncate text-sm font-medium text-foreground"
            >
              {displayName}&apos;s Squadra
            </CollapseLabel>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center">
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-colors duration-200 motion-reduce:transition-none",
                  menuOpen ? "rotate-180 text-sidebar-foreground" : "rotate-0",
                  open ? "opacity-100" : "pointer-events-none opacity-0"
                )}
              />
            </span>
          </button>
        }
      />

      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-64 rounded-xl border border-border/50 bg-popover p-1.5 shadow-lg ring-1 ring-black/[0.04] dark:ring-white/10"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 font-normal">
            <AvatarImage
              src={avatarUrl}
              alt={fullName}
              className="h-9 w-9 shrink-0 rounded-full object-cover text-xs ring-1 ring-border shadow-sm"
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[13px] font-semibold tracking-[-0.01em] text-foreground">
                {fullName}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {email || "Signed in"}
              </span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-1.5 bg-border/50" />

        <DropdownMenuGroup className="space-y-0.5">
          {github ? (
            <DropdownMenuItem
              className="gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-[450] tracking-[-0.01em] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-foreground/[0.06] dark:hover:bg-white/[0.06] focus:bg-foreground/[0.06] dark:focus:bg-white/[0.06] focus:text-foreground data-highlighted:bg-foreground/[0.06] dark:data-highlighted:bg-white/[0.06]"
              onClick={() => openSettings("integrations", "github")}
            >
              <FaGithub className="size-4 text-muted-foreground transition-colors duration-200 group-hover/dropdown-menu-item:text-foreground group-focus/dropdown-menu-item:text-foreground" />
              <div className="flex min-w-0 flex-col">
                <span className="text-[13.5px] font-medium text-foreground">GitHub</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckIcon className="size-3 text-emerald-500" />
                  Connected as @{github.username}
                </span>
              </div>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              className="gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-[450] tracking-[-0.01em] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-foreground/[0.06] dark:hover:bg-white/[0.06] focus:bg-foreground/[0.06] dark:focus:bg-white/[0.06] focus:text-foreground data-highlighted:bg-foreground/[0.06] dark:data-highlighted:bg-white/[0.06]"
              onClick={connectGithub}
            >
              <FaGithub className="size-4 text-muted-foreground" />
              <span className="text-[13.5px] font-medium text-foreground">Connect GitHub</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-1.5 bg-border/50" />

        <DropdownMenuGroup className="space-y-0.5">
          <DropdownMenuItem
            className="gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-[450] tracking-[-0.01em] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-foreground/[0.06] dark:hover:bg-white/[0.06] focus:bg-foreground/[0.06] dark:focus:bg-white/[0.06] focus:text-foreground data-highlighted:bg-foreground/[0.06] dark:data-highlighted:bg-white/[0.06]"
            onClick={() => openSettings("account", "profile")}
          >
            <SettingsIcon className="size-4 text-muted-foreground" />
            <span className="text-[13.5px] font-medium text-foreground">Settings</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            variant="destructive"
            className="gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-[450] tracking-[-0.01em] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20"
          >
            <LogOutIcon className="size-4" />
            <span className="text-[13.5px] font-medium">Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
