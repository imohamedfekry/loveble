"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGithubAccount } from "@/components/user/hooks/useGithubAccount";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/settings.store";
import { useUserStore } from "@/store/user.store";
import { SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import {
  SETTINGS_NAV,
  type SettingsNavGroup,
  type SettingsNavItem,
  type SettingsSectionId,
} from "./settings-config";

function SidebarNavItem({
  item,
  isActive,
  onSelect,
}: {
  item: SettingsNavItem;
  isActive: boolean;
  onSelect: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0 opacity-80" />
      <span className="truncate">{item.label}</span>
    </button>
  );
}

function SidebarSubNavItem({
  label,
  isActive,
  onSelect,
}: {
  label: string;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative w-full rounded-md py-1 ps-7 pe-2.5 text-left text-sm transition-colors",
        isActive
          ? "font-medium text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "absolute inset-s-3 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full",
          isActive ? "bg-foreground" : "bg-border",
        )}
      />
      {label}
    </button>
  );
}

function filterNavGroups(
  groups: SettingsNavGroup[],
  query: string,
): SettingsNavGroup[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return groups;

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const matchesItem = item.label.toLowerCase().includes(normalized);
        const matchesSub = item.subSections?.some((sub) =>
          sub.label.toLowerCase().includes(normalized),
        );
        return matchesItem || matchesSub;
      }),
    }))
    .filter((group) => group.items.length > 0);
}

export function SettingsSidebar() {
  const user = useUserStore((s) => s.user);
  const { github } = useGithubAccount();
  const activeSection = useSettingsStore((s) => s.activeSection);
  const activeSubSection = useSettingsStore((s) => s.activeSubSection);
  const setActiveSection = useSettingsStore((s) => s.setActiveSection);
  const [search, setSearch] = useState("");

  const avatarUrl =
    github?.avatar_url ??
    user?.oauthAccounts.find((acc) => acc.avatar_url)?.avatar_url ??
    null;
  const fallback = user?.username?.slice(0, 2).toUpperCase() ?? "U";
  const displayName = github?.displayName?.trim() || user?.username || "User";

  const filteredNav = useMemo(
    () => filterNavGroups(SETTINGS_NAV, search),
    [search],
  );

  const handleSelectSection = (
    sectionId: SettingsSectionId,
    subSection?: string | null,
  ) => {
    setActiveSection(sectionId, subSection ?? null);
  };

  return (
    <aside className="flex h-full w-[218px] shrink-0 flex-col bg-sidebar">
      <div className="space-y-3 border-b border-sidebar-border p-3">
        <div className="flex items-center gap-2.5">
          <Avatar className="size-10">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">
              {displayName}
            </p>
            <button
              type="button"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => handleSelectSection("account", "profile")}
            >
              Edit Profile
            </button>
          </div>
        </div>

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            className="h-8 bg-background/40 ps-8 text-xs"
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <nav className="space-y-4 p-2">
          {filteredNav.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-2.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                {group.label}
              </p>

              {group.items.map((item) => {
                const isActive = activeSection === item.id;

                return (
                  <div key={item.id} className="space-y-0.5">
                    <SidebarNavItem
                      item={item}
                      isActive={isActive}
                      onSelect={() =>
                        handleSelectSection(
                          item.id,
                          item.subSections?.[0]?.id ?? null,
                        )
                      }
                    />

                    {isActive &&
                      item.subSections?.map((sub) => (
                        <SidebarSubNavItem
                          key={sub.id}
                          label={sub.label}
                          isActive={activeSubSection === sub.id}
                          onSelect={() =>
                            handleSelectSection(item.id, sub.id)
                          }
                        />
                      ))}
                  </div>
                );
              })}
            </div>
          ))}

          {filteredNav.length === 0 && (
            <p className="px-2.5 py-4 text-center text-xs text-muted-foreground">
              No settings found
            </p>
          )}
        </nav>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={() => handleSelectSection("account")}
        >
          Back to account
        </Button>
      </div>
    </aside>
  );
}
