"use client";

import { useState } from "react";
import { ChevronDown, LayoutGrid, Plus, SettingsIcon } from "lucide-react";

import { useGithubAccount } from "@/components/user/hooks/useGithubAccount";
import { useSettings } from "@/components/settings/use-settings";
import { useUserStore } from "@/store/user.store";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@loveble/ui/dropdown-menu";

import { cn } from "@loveble/utils";
import { CollapseLabel } from "./CollapseLabel";

export function WorkspaceMenu({ open }: { open: boolean }) {
  const { github } = useGithubAccount();
  const user = useUserStore((s) => s.user);
  const { openSettings } = useSettings();
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName = (github?.displayName || user?.username || "User").split(
    " "
  )[0];
  const fullName = github?.displayName || user?.username || "User";

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger
        render={
          <button
            aria-label="Open workspace menu"
            aria-expanded={menuOpen}
            className={cn(
              "group relative flex h-7 w-full items-center overflow-hidden rounded-md p-0 text-left ring-1",
              !open && "justify-center",
              "text-[12.5px] font-[450] tracking-[-0.01em]",
              "transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-0",
              menuOpen
                ? "bg-foreground/[0.06] text-sidebar-foreground ring-border shadow-sm"
                : "ring-border text-muted-foreground hover:bg-foreground/[0.06] hover:text-sidebar-foreground"
            )}
          >
            <span className="flex h-7 w-8 shrink-0 items-center justify-center">
              <div className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-[#e91e8c] text-[10px] font-bold leading-none text-white">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </span>
            <CollapseLabel
              open={open}
              className="min-w-0 flex-1 truncate text-[12.5px] font-medium"
            >
              {displayName}&apos;s Squadra
            </CollapseLabel>
            {open && (
              <span className="flex h-7 w-8 shrink-0 items-center justify-center">
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-200 motion-reduce:transition-none",
                    menuOpen ? "rotate-180" : "rotate-0",
                  )}
                />
              </span>
            )}
          </button>
        }
      />

      <DropdownMenuContent
        align="start"
        sideOffset={4}
        className="w-[280px] rounded-xl p-2 shadow-2xl"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-3 px-2.5 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e91e8c] text-[13px] font-bold text-white">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[13px] font-semibold text-popover-foreground">
                {fullName}
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
                Free Plan
              </span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <div className="mx-2 my-1 h-px bg-border" />

        <DropdownMenuGroup>
          <DropdownMenuItem
            className="flex items-center justify-center gap-2.5 rounded-lg border border-border px-3 py-2 text-[12.5px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-accent-foreground"
            onClick={() => openSettings("account", "profile")}
          >
            <SettingsIcon className="h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <div className="mx-2 my-1 h-px bg-border" />

        <DropdownMenuGroup className="space-y-0.5">
          <DropdownMenuItem className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-accent-foreground">
            <Plus className="h-4 w-4" />
            <span>New workspace</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <div className="mx-2 my-1 h-px bg-border" />

        <DropdownMenuGroup className="space-y-0.5">
          <DropdownMenuItem className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-accent-foreground">
            <LayoutGrid className="h-4 w-4" />
            <span>All projects</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
