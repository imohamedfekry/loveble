"use client";

import { useCallback, useState } from "react";

import Image from "next/image";
import { usePathname } from "next/navigation";

import {
  Inbox,
  PanelLeftClose,
  PanelLeftOpen,
  StarIcon,
  UsersRoundIcon,
} from "lucide-react";

import {
  FolderLibraryIcon,
  Home12Icon,
  Navigation04Icon,
  Search01Icon,
  User03Icon,
  WorkflowSquare09Icon,
} from "@hugeicons/core-free-icons";

import { NavItem } from "./NavItem";
import { SectionLabel } from "./SectionLabel";
import { ProjectsList } from "@/components/layout/sidebar/projects-list";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { MOD_KEY_CODES } from "@/lib/keyboard";
import { useKeyboardShortcut } from "@/lib/hooks/useKeyboardShortcut";
import { useModKeyLabel } from "@/lib/hooks/useModKeyLabel";

import {
  TooltipContent,
  TooltipTrigger,
  Tooltip,
} from "../../ui/tooltip";

import { useGithubAccount } from "@/components/user/hooks/useGithubAccount";
import { useUserStore } from "@/store/user.store";
import { AvatarImage } from "./AvatarImage";
import { WorkspaceMenu } from "./WorkspaceMenu";
import { useSearchStore } from "@/store/search.store";
import { useConnectorsStore } from "@/store/connectors.store";

const iconSwapMotion =
  "transition-[opacity,transform] duration-(--duration-quick) ease-(--ease-in-out) motion-reduce:transition-none";

export function AppSidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isClosing, setIsClosing] = useState(false);

  const [prevOpen, setPrevOpen] = useState(open);

  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setIsClosing(false);
    }
  }

  const { openSearch } = useSearchStore();
  const { openConnectors } = useConnectorsStore();
  const { github } = useGithubAccount();
  const user = useUserStore((s) => s.user);
  const pathname = usePathname();

  const avatarUrl = github?.avatar_url;

  const displayName = (
    github?.displayName ||
    user?.username ||
    "User"
  ).split(" ")[0];

  const showExpandedChrome = open || isClosing;

  const handleClose = () => {
    setIsClosing(true);
    onOpenChange(false);
  };

  const handleOpen = () => {
    setIsClosing(false);
    onOpenChange(true);
  };

  const toggleSidebar = useCallback(() => {
    if (open) {
      handleClose();
    } else {
      handleOpen();
    }
  }, [open, handleClose, handleOpen]);

  useKeyboardShortcut(MOD_KEY_CODES.B, toggleSidebar);

  const modKey = useModKeyLabel();

  const handleSidebarTransitionEnd = (
    e: React.TransitionEvent<HTMLElement>
  ) => {
    if (e.propertyName !== "width") return;

    if (!open) {
      setIsClosing(false);
    }
  };

  return (
    <aside
      data-open={open}
      style={{
        width: open ? 256 : 48,
      }}
      onTransitionEnd={handleSidebarTransitionEnd}
      onClick={open ? undefined : handleOpen}
      role={open ? undefined : "button"}
      aria-label={open ? undefined : "Open sidebar"}
      className={cn(
        "group/sidebar hidden shrink-0 flex-col overflow-hidden bg-sidebar py-2 will-change-[width]",
        "transition-[width] duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none md:flex",
        !open && "cursor-e-resize"
      )}
    >
      {/* ================================================== */}
      {/* Header */}
      {/* ================================================== */}

      <div
        className="
          mb-4
          flex
          h-8
          shrink-0
          items-center
          px-2
        "
      >
        {/* ================================================== */}
        {/* Logo / Open */}
        {/* ================================================== */}

        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();

                  if (!open) {
                    handleOpen();
                  }
                }}
                aria-label={open ? "Loveble" : "Open sidebar"}
                className={cn(
                  "group/logo grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 ring-transparent",
                  "transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-foreground/[0.06] hover:ring-border/50 dark:hover:bg-white/[0.06] dark:hover:ring-white/10 motion-reduce:transition-none",
                  open ? "cursor-default" : "cursor-e-resize"
                )}
              >
                <Image
                  src="/logo.svg"
                  alt="loveble"
                  width={18}
                  height={18}
                  loading="eager"
                  className={cn(
                    iconSwapMotion,
                    "col-start-1 row-start-1 size-4.5 object-contain",
                    showExpandedChrome
                      ? "scale-100 opacity-100"
                      : cn(
                          "scale-100 opacity-100",
                          "group-hover/sidebar:scale-75 group-hover/sidebar:opacity-0"
                        )
                  )}
                />

                {!open && (
                  <PanelLeftOpen
                    aria-hidden={isClosing}
                    className={cn(
                      iconSwapMotion,
                      "col-start-1 row-start-1 size-4.5 text-sidebar-foreground",
                      isClosing
                        ? "scale-75 opacity-0"
                        : cn(
                            "scale-75 opacity-0",
                            "group-hover/sidebar:scale-100 group-hover/sidebar:opacity-100"
                          )
                    )}
                  />
                )}
              </button>
            }
          />

          <TooltipContent>
            {open
              ? "Loveble"
              : `Open sidebar (${modKey} B)`}
          </TooltipContent>
        </Tooltip>

        {/* ================================================== */}
        {/* Close */}
        {/* ================================================== */}

        {showExpandedChrome && (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  aria-label="Close sidebar"
                  className={cn(
                    "ml-auto flex h-8 w-8 shrink-0 cursor-e-resize items-center justify-center rounded-lg text-muted-foreground ring-1 ring-transparent",
                    "transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                    "hover:bg-foreground/[0.06] hover:text-sidebar-foreground hover:ring-border/50 dark:hover:bg-white/[0.06] dark:hover:ring-white/10",
                    open ? "opacity-100" : "pointer-events-none opacity-0"
                  )}
                >
                  <PanelLeftClose className="size-4.5" />
                </button>
              }
            />

            <TooltipContent>
              {`Close sidebar (${modKey} B)`}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* ================================================== */}
      {/* Workspace */}
      {/* ================================================== */}

      <div
        className={cn("mb-2 px-2", !open && "cursor-pointer")}
        onClick={(e) => e.stopPropagation()}
      >
        <WorkspaceMenu open={open} />
      </div>

      {/* ================================================== */}
      {/* Main Navigation */}
      {/* ================================================== */}

      <nav className="space-y-1 px-2">
        <NavItem
          open={open}
          icon={Home12Icon}
          label="Dashboard"
          active={pathname === "/dashboard" || pathname?.startsWith("/dashboard/")}
          href="/dashboard"
        />

        <NavItem
          open={open}
          icon={Search01Icon}
          label="Search"
          shortcut="K"
          onClick={() => openSearch()}
        />

        <NavItem
          open={open}
          icon={Navigation04Icon}
          label="Resources"
        />

        <NavItem
          open={open}
          icon={WorkflowSquare09Icon}
          label="Connectors"
          onClick={() => openConnectors()}
        />
      </nav>

      {/* ================================================== */}
      {/* Projects */}
      {/* ================================================== */}

      <SectionLabel open={open}>
        Projects
      </SectionLabel>

      <nav className="space-y-1 px-2">
        <NavItem
          open={open}
          icon={FolderLibraryIcon}
          label="All projects"
          active={pathname === "/projects" || pathname?.startsWith("/project/")}
          href="/projects"
        />

        <NavItem
          open={open}
          icon={StarIcon}
          label="Starred"
          active={pathname === "/projects/starred"}
          href="/projects/starred"
        />

        <NavItem
          open={open}
          icon={User03Icon}
          label="Created by me"
          active={pathname === "/projects/created"}
          href="/projects/created"
        />

        <NavItem
          open={open}
          icon={UsersRoundIcon}
          label="Shared with me"
          active={pathname === "/projects/shared"}
          href="/projects/shared"
        />
      </nav>

      {/* ================================================== */}
      {/* Recents */}
      {/* ================================================== */}

      <SectionLabel open={open}>
        Recents
      </SectionLabel>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          open ? "max-h-[320px] opacity-100" : "pointer-events-none max-h-0 opacity-0"
        )}
        onClick={(e) => e.stopPropagation()}
        aria-hidden={!open}
      >
        <div className="space-y-1 px-2 py-1">
          <ProjectsList />
        </div>
      </div>

      {!open && (
        <div
          className="min-h-6 flex-1 cursor-e-resize"
          aria-hidden
        />
      )}

      {/* ================================================== */}
      {/* Bottom */}
      {/* ================================================== */}

      <div className="mt-auto shrink-0 px-2 pt-6">
        <div
          className={cn(
            "relative transition-[height] duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none",
            open ? "h-8" : "h-28"
          )}
        >
          {/* Avatar */}

          <AvatarImage
            src={avatarUrl}
            alt={displayName}
            className={cn(
              `absolute h-6 w-6 shrink-0 rounded-full object-cover text-xs ring-1 ring-border transition-[bottom] duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none`,
              open ? "bottom-1 left-1" : "bottom-20 left-1"
            )}
          />

          {/* Theme toggle */}

          <div
            className={cn(
              "absolute [&>button]:size-8 [&>button]:rounded-lg [&>button]:ring-1 [&>button]:ring-transparent [&>button]:text-muted-foreground",
              "[&>button]:transition-colors [&>button]:duration-200 [&>button]:ease-[cubic-bezier(0.22,1,0.36,1)]",
              "[&>button]:hover:bg-foreground/[0.06] [&>button]:hover:text-sidebar-foreground [&>button]:hover:ring-border/50 dark:[&>button]:hover:bg-white/[0.06] dark:[&>button]:hover:ring-white/10",
              "transition-[bottom,right] duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none will-change-transform",
              open ? "bottom-0 right-8" : "bottom-10 right-0"
            )}
            onClick={(e) => {
              if (!open) e.stopPropagation();
            }}
          >
            <ThemeToggle />
          </div>

          {/* Inbox */}

          <div className="absolute bottom-0 right-0">
            <button
              type="button"
              aria-label="Inbox"
              onClick={(e) => {
                if (!open) e.stopPropagation();
              }}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground ring-1 ring-transparent transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-foreground/[0.06] hover:text-sidebar-foreground hover:ring-border/50 dark:hover:bg-white/[0.06] dark:hover:ring-white/10 motion-reduce:transition-none"
            >
              <Inbox className="size-4.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}