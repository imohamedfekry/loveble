"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

const OPTIONS: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const current = (theme ?? "system") as Theme;

  const CurrentIcon =
    !mounted || current === "system"
      ? Monitor
      : current === "dark"
        ? Moon
        : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            className={cn("size-8 text-muted-foreground hover:text-foreground", className)}
          >
            <CurrentIcon className="size-4" />
          </Button>
        }
      />

      <DropdownMenuContent align="end" side="top" className="min-w-36">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        {OPTIONS.map(({ value, label, icon: Icon }) => {
          const active = mounted && current === value;

          return (
            <DropdownMenuItem
              key={value}
              onClick={() => setTheme(value)}
              className="gap-2.5"
            >
              <Icon className="size-4" />
              <span>{label}</span>
              {active && <span className="ml-auto text-primary">●</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
