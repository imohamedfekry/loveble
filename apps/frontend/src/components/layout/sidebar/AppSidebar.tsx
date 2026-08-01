import {
  ChevronDown,
  Gift,
  Inbox,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
} from "lucide-react";
import { CollapseLabel } from "./CollapseLabel";
import { NavItem } from "./NavItem";
import { PromoCard } from "./PromoCard";
import { SectionLabel } from "./SectionLabel";
import { NAV_MAIN, NAV_PROJECTS } from "./nav-config";
import { ProjectsList } from "@/components/layout/sidebar/projects-list";
import { TooltipContent, TooltipTrigger, Tooltip } from "../../ui/tooltip";

export function AppSidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {

  return (
    <aside
      data-open={open}
      style={{ width: open ? 256 : 60 }}
      onClick={open ? undefined : () => onOpenChange(true)}
      role={open ? undefined : "button"}
      aria-label={open ? undefined : "Open sidebar"}
      className={`group/sidebar hidden md:flex shrink-0 flex-col  bg-[#0d0d12] py-4 overflow-hidden transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "" : "cursor-e-resize"}`}
    >
      {/* Logo + toggle */}
      <div className="mb-3 flex h-8 items-center px-3">
        <Tooltip>
          <TooltipTrigger>
            <button
              onClick={() => (open ? undefined : onOpenChange(true))}
              aria-label={open ? "Logo" : "Open sidebar"}
              className="group/logo relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md cursor-e-resize"
              tabIndex={open ? -1 : 0}
            >
              <img
                src="/logo.svg"
                alt="Squadra"
                className={`h-7 w-7 rounded-md object-contain transition-opacity duration-200 ${open ? "" : "group-hover/sidebar:opacity-0"}`}
              />
              {!open && (
                <PanelLeftOpen className="absolute h-4 w-4 text-neutral-200 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100" />
              )}
            </button>
          </TooltipTrigger>

          <TooltipContent>
            Open sidebar (Ctrl B)
          </TooltipContent>
        </Tooltip>

        <span className={`ml-2 text-sm font-semibold text-neutral-100 whitespace-nowrap transition-opacity duration-300 ${open ? "opacity-100 delay-150" : "opacity-0"}`}>
          Squadra
        </span>

        <Tooltip>
          <TooltipTrigger className="ml-auto">
            <button
              onClick={() => onOpenChange(false)}
              className={`ml-auto cursor-e-resize not-only-of-type:rounded-md p-1.5 text-neutral-400 transition-opacity duration-200 hover:bg-neutral-800 hover:text-neutral-200 ${open ? "opacity-100 delay-150" : "pointer-events-none opacity-0"}`}
              aria-label="Close sidebar"
              tabIndex={open ? 0 : -1}
            >

              <PanelLeftClose className="h-4 w-4" />

            </button>
          </TooltipTrigger>
         <TooltipContent>
            Open sidebar (Ctrl B)
          </TooltipContent>
        </Tooltip>


      </div>

      {/* Workspace */}
      <div className="mb-4 px-3">
        <button className="flex h-8 w-full items-center rounded-lg border border-neutral-800 bg-[#141419] px-1 text-left hover:bg-neutral-900">
          <img
            src="https://avatars.githubusercontent.com/u/171652970?v=4"
            alt="Mohamed Fekry"
            className="h-6 w-6 shrink-0 rounded object-cover"
          />
          <CollapseLabel open={open} className="ml-2 text-sm text-neutral-200">
            mohamed's Squadra
          </CollapseLabel>
          <ChevronDown
            className={`h-4 w-4 ml-auto shrink-0 text-neutral-500 transition-opacity duration-300 ${open ? "opacity-100 delay-150" : "opacity-0"}`}
          />
        </button>
      </div>

      {/* Nav */}
      <nav className="space-y-0.5 px-3">
        {NAV_MAIN.map((item) => (
          <NavItem key={item.label} open={open} {...item} />
        ))}
      </nav>

      <SectionLabel open={open}>Projects</SectionLabel>
      <nav className="space-y-0.5 px-3">
        {NAV_PROJECTS.map((item) => (
          <NavItem key={item.label} open={open} {...item} />
        ))}
      </nav>

      <SectionLabel open={open}>Recents</SectionLabel>
      <div
        className={`space-y-0.5 px-3 transition-[max-height,opacity] duration-300 ${open ? "max-h-40 opacity-100 delay-150" : "max-h-0 opacity-0 hidden"}`}
      >
        <ProjectsList />
      </div>

      {/* Bottom */}
      <div className="mt-auto space-y-2 px-3 pt-6">
        <PromoCard open={open} icon={Gift} title="Share Squadra" subtitle="100 credits per paid referral" />
        <PromoCard open={open} icon={Zap} title="Upgrade to Pro" subtitle="Unlock more features" />
        <div className="flex items-center justify-between px-1 pt-1">
          <img
            src="https://avatars.githubusercontent.com/u/171652970?v=4"
            alt="Mohamed Fekry"
            className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-neutral-700"
          />
          <button className={`rounded-md p-1.5 text-neutral-400 transition-opacity duration-200 hover:bg-neutral-800 hover:text-neutral-200 ${open ? "opacity-100 delay-150" : "opacity-0 pointer-events-none"}`}>
            <Inbox className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}