"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";
import {
  UserIcon,
  PlugIcon,
  BellIcon,
  PaletteIcon,
} from "lucide-react";

import { useKeyboardShortcut } from "@loveble/ui";
import { MOD_KEY_CODES } from "@loveble/utils";
import { useProjectsStore } from "@/store/project.store";
import { useSettingsStore } from "@/store/settings.store";
import { useSearchStore } from "@/store/search.store";
import { SETTINGS_NAV } from "@/components/settings/settings-config";
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@loveble/ui/command";
import { Spinner } from "@loveble/ui/spinner";
import type { Project } from "@loveble/types";

type SearchResult =
  | { type: "project"; data: Project }
  | { type: "settings"; sectionId: string; label: string };

const SECTION_ICONS: Record<string, React.ReactNode> = {
  account: <UserIcon className="h-4 w-4" />,
  integrations: <PlugIcon className="h-4 w-4" />,
  notifications: <BellIcon className="h-4 w-4" />,
  appearance: <PaletteIcon className="h-4 w-4" />,
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const projects = useProjectsStore((s) => s.projects);
  const loading = useProjectsStore((s) => s.loading);
  const openSettings = useSettingsStore((s) => s.openSettings);
  const isOpen = useSearchStore((s) => s.isOpen);
  const setIsOpen = useSearchStore((s) => s.toggleSearch);

  useKeyboardShortcut(MOD_KEY_CODES.K, () => setIsOpen(), true);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];

    const q = query.toLowerCase().trim();
    const searchResults: SearchResult[] = [];

    const matchingProjects = projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q),
    );

    for (const project of matchingProjects) {
      searchResults.push({ type: "project", data: project });
    }

    for (const group of SETTINGS_NAV) {
      for (const item of group.items) {
        if (
          item.label.toLowerCase().includes(q) ||
          item.subSections?.some((sub) =>
            sub.label.toLowerCase().includes(q),
          )
        ) {
          searchResults.push({
            type: "settings",
            sectionId: item.id,
            label: item.label,
          });
        }
      }
    }

    return searchResults;
  }, [query, projects, loading]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setQuery("");
      useSearchStore.getState().closeSearch();

      if (result.type === "project") {
        router.push(`/project/${result.data.id}`);
      } else {
        openSettings(result.sectionId as any);
      }
    },
    [router, openSettings],
  );

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      useSearchStore.getState().closeSearch();
      setQuery("");
    },
    [],
  );

  return (
    <>
      <CommandDialog
        open={isOpen}
        onOpenChange={handleOpenChange}
        title="Search"
        description="Search projects and settings"
        className="sm:max-w-130"
        overlayClassName="bg-black/50"
      >
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search projects or settings..."
          className="border-b border-border/50 rounded-none rounded-t-xl px-4"
        />
        <CommandList className="max-h-80">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-5 w-5" />
            </div>
          ) : results.length === 0 ? (
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-6">
                <SearchIcon className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No results found
                </p>
              </div>
            </CommandEmpty>
          ) : (
            <>
              {results.filter((r) => r.type === "project").length > 0 && (
                <CommandGroup heading="Projects">
                  {results
                    .filter(
                      (r): r is Extract<SearchResult, { type: "project" }> =>
                        r.type === "project",
                    )
                    .map((result) => (
                      <CommandItem
                        key={result.data.id}
                        onSelect={() => handleSelect(result)}
                        className="gap-3"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground/70 transition-colors group-data-selected/command-item:text-foreground">
                          <SearchIcon className="h-3.5 w-3.5" />
                        </div>
                        <span className="flex-1 truncate text-sm">
                          {result.data.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {result.data.id.slice(0, 8)}
                        </span>
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}
              {results.filter((r) => r.type === "settings").length > 0 && (
                <CommandGroup heading="Settings">
                  {results
                    .filter(
                      (r): r is Extract<SearchResult, { type: "settings" }> =>
                        r.type === "settings",
                    )
                    .map((result) => (
                      <CommandItem
                        key={result.sectionId}
                        onSelect={() => handleSelect(result)}
                        className="gap-3"
                      >
                        <span className="flex h-7 w-7 items-center justify-center text-muted-foreground/70 transition-colors group-data-selected/command-item:text-foreground">
                          {SECTION_ICONS[result.sectionId] ?? <SearchIcon className="h-4 w-4" />}
                        </span>
                        <span className="flex-1 text-sm">{result.label}</span>
                        <CommandShortcut>⌘K</CommandShortcut>
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
