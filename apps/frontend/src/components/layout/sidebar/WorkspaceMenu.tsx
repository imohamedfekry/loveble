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
            className={`group flex h-8 w-full items-center gap-2 rounded-lg px-1 text-left
  shadow-[0_0_0.0px_1px_rgba(115,115,115,0.35)]
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60
  ${menuOpen ? "bg-neutral-800/80" : "hover:bg-neutral-800/60"}
`}          >
            <AvatarImage
              src={null}
              alt={displayName}
              className="h-6 w-6 shrink-0 rounded-sm object-cover text-[10px] "
            />
            <CollapseLabel
              open={open}
              className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-200"
            >
              {displayName}&apos;s Squadra
            </CollapseLabel>
            <ChevronDown
              className={`
    h-4 w-4 shrink-0
    text-neutral-500
    transition-transform
    duration-(--duration-quick)
    ease-(--ease-smooth-out)
    ${menuOpen ? "rotate-180" : "rotate-0"}
    ${open ? "opacity-100" : "pointer-events-none opacity-0"}
  `}
            />
          </button>
        }
      />

      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-64 rounded-lg border-neutral-700/90 bg-neutral-800 p-1.5 shadow-2xl shadow-black/50"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2 font-normal">
            <AvatarImage
              src={avatarUrl}
              alt={fullName}
              className="h-9 w-9 shrink-0 rounded-full object-cover text-xs ring-1 ring-white/10"
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-xs font-semibold text-neutral-100">
                {fullName}
              </span>
              <span className="truncate text-xs text-neutral-400">
                {email || "Signed in"}
              </span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {github ? (
            <DropdownMenuItem
              className="gap-2.5 px-2 py-1.5 focus:bg-white/[0.06] focus:text-neutral-100"
              onClick={() => openSettings("integrations", "github")}
            >
              <FaGithub className="size-4 text-neutral-300" />
              <div className="flex min-w-0 flex-col">
                <span className="text-sm text-neutral-200">GitHub</span>
                <span className="flex items-center gap-1 text-xs text-neutral-400">
                  <CheckIcon className="size-3 text-emerald-500" />
                  Connected as @{github.username}
                </span>
              </div>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              className="gap-2.5 px-2 py-1.5 focus:bg-white/[0.06] focus:text-neutral-100"
              onClick={connectGithub}
            >
              <FaGithub className="size-4 text-neutral-300" />
              <span className="text-sm text-neutral-200">Connect GitHub</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            className="gap-2.5 px-2 py-1.5 focus:bg-white/[0.06] focus:text-neutral-100"
            onClick={() => openSettings("account", "profile")}
          >
            <SettingsIcon className="size-4 text-neutral-300" />
            <span className="text-sm text-neutral-200">Settings</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            variant="destructive"
            className="gap-2.5 px-2 py-1.5 data-[variant=destructive]:focus:bg-destructive/15"
          >
            <LogOutIcon className="size-4" />
            <span className="text-sm">Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
