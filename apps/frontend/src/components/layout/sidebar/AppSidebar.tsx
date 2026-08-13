"use client";

import { useState } from "react";
import {
  Gift,
  Inbox,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
} from "lucide-react";
import { NavItem } from "./NavItem";
import { PromoCard } from "./PromoCard";
import { SectionLabel } from "./SectionLabel";
import { NAV_MAIN, NAV_PROJECTS } from "./nav-config";
import { ProjectsList } from "@/components/layout/sidebar/projects-list";
import { TooltipContent, TooltipTrigger, Tooltip } from "../../ui/tooltip";
import { useGithubAccount } from "@/components/user/hooks/useGithubAccount";
import { useUserStore } from "@/store/user.store";
import { AvatarImage } from "./AvatarImage";
import { WorkspaceMenu } from "./WorkspaceMenu";

export function AppSidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { github } = useGithubAccount();
  const user = useUserStore((s) => s.user);

  const [hoverEmpty, setHoverEmpty] = useState(false);

  const avatarUrl = github?.avatar_url;
  const displayName = (github?.displayName || user?.username || "User").split(" ")[0];

  return (
    <aside
      data-open={open}
      style={{ width: open ? 256 : 48 }}
      onClick={open ? undefined : () => onOpenChange(true)}
      onMouseMove={(e) => setHoverEmpty(e.target === e.currentTarget)}
      onMouseLeave={() => setHoverEmpty(false)}
      role={open ? undefined : "button"}
      aria-label={open ? undefined : "Open sidebar"}
      className={`group/sidebar hidden md:flex shrink-0 flex-col bg-[#0d0d12] py-4 overflow-hidden transition-[width] duration-(--duration-medium) data-[open=true]:duration-(--duration-slow) ease-(--ease-smooth-out) will-change-[width] motion-reduce:transition-none ${open ? "" : hoverEmpty ? "cursor-e-resize" : ""}`}
    >
      {/* Logo + toggle */}
      <div className="mb-3 flex h-8 items-center px-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                onClick={() => (open ? undefined : onOpenChange(true))}
                aria-label={open ? "Logo" : "Open sidebar"}
                className="group/logo relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md cursor-e-resize"
                tabIndex={open ? -1 : 0}
              >
                <img
                  src="/logo.svg"
                  alt="Squadra"
                  className={`h-7 w-7 rounded-md object-contain transition-opacity duration-(--duration-fast) ease-in-out ${open ? "" : "group-hover/sidebar:opacity-0"}`}
                />
                {!open && (
                  <PanelLeftOpen className="absolute h-4 w-4 text-neutral-200 opacity-0 transition-opacity duration-(--duration-fast) ease-in-out group-hover/sidebar:opacity-100" />
                )}
              </button>
            }
          />
          <TooltipContent>Open sidebar (Ctrl B)</TooltipContent>
        </Tooltip>

        <span
          className={`ml-2 text-sm font-semibold text-neutral-100 whitespace-nowrap transition-[opacity,transform] duration-(--duration-quick) ease-in-out motion-reduce:transition-none ${
            open ? "translate-x-0 opacity-100 delay-(--duration-micro)" : "-translate-x-1 opacity-0"
          }`}
        >
          Squadra
        </span>

        <Tooltip>
          <TooltipTrigger
            className="ml-auto"
            render={
              <button
                onClick={() => onOpenChange(false)}
                className={`ml-auto cursor-e-resize rounded-md p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-[opacity,transform] duration-(--duration-fast) ease-in-out motion-reduce:transition-none ${
                  open ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-1 opacity-0"
                }`}
                aria-label="Close sidebar"
                tabIndex={open ? 0 : -1}
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            }
          />
          <TooltipContent>Open sidebar (Ctrl B)</TooltipContent>
        </Tooltip>
      </div>

      {/* Workspace */}
      <div className="mb-4 px-2" onClick={(e) => e.stopPropagation()}>
        <WorkspaceMenu open={open} />
      </div>

      {/* Nav */}
      <nav className="space-y-0.5 px-2">
        {NAV_MAIN.map((item) => (
          <NavItem key={item.label} open={open} {...item} />
        ))}
      </nav>

      <SectionLabel open={open}>Projects</SectionLabel>
      <nav className="space-y-0.5 px-2">
        {NAV_PROJECTS.map((item) => (
          <NavItem key={item.label} open={open} {...item} />
        ))}
      </nav>

      <SectionLabel open={open}>Recents</SectionLabel>
      <div
        className={`overflow-hidden transition-[max-height,opacity] duration-(--duration-medium) group-data-[open=true]/sidebar:duration-(--duration-slow) ease-(--ease-smooth-out) motion-reduce:transition-none ${
          open ? "max-h-45 opacity-100 delay-(--duration-micro)" : "max-h-0 opacity-0"
        }`}

      >
        <div className="space-y-0.5 px-2">
          <ProjectsList />
        </div>
      </div>

      {/* Bottom */}
      <div className="mt-auto space-y-1 px-2 pt-6">
        {/* <PromoCard open={open} icon={Gift} title="Share Squadra" subtitle="500 credits per paid referral" /> */}
        {/* <PromoCard open={open} icon={Zap} title="Upgrade to Pro" subtitle="Unlock more features" /> */}
        <div className="relative h-20 overflow-hidden">
          <AvatarImage
            src={avatarUrl}
            alt={displayName}
            className={`absolute bottom-1 left-1 h-6 w-6 shrink-0 rounded-full object-cover text-xs ring-1 ring-neutral-700 transition-[transform,opacity] duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none ${
              open ? "translate-y-0 opacity-100" : "-translate-y-7.5 "
            }`}
          />
          <button
            aria-label="Inbox"
            className={`absolute bottom-1 right-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-transform duration-(--duration-fast) ease-(--ease-smooth-out) motion-reduce:transition-none ${
              open ? "translate-y-1.5 opacity-100" : "translate-y-3 translate-x-1"
            }`}
          >
            <Inbox className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}