"use client";

import { ScrollArea } from "@loveble/ui/scroll-area";
import { cn } from "@loveble/utils";
import { useSettingsStore } from "@/store/settings.store";
import {
  SETTINGS_NAV,
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
        "flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-[450] tracking-[-0.01em] ring-1 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        isActive
          ? "bg-foreground/[0.06] text-foreground ring-border/50 shadow-sm"
          : "text-muted-foreground ring-transparent hover:bg-foreground/[0.06] hover:text-foreground hover:ring-border/50"
      )}
    >
      <Icon className="size-4 shrink-0" />
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
        "relative flex h-7 w-full items-center rounded-lg ps-8 pe-2.5 text-left text-[13px] font-[450] tracking-[-0.01em] ring-1 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        isActive
          ? "bg-foreground/[0.06] font-medium text-foreground ring-border/50 shadow-sm"
          : "text-muted-foreground ring-transparent hover:bg-foreground/[0.04] hover:text-foreground hover:ring-border/30"
      )}
    >
      <span
        className={cn(
          "absolute left-3 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full transition-colors duration-200",
          isActive ? "bg-foreground" : "bg-border"
        )}
      />
      {label}
    </button>
  );
}

export function SettingsSidebar() {
  const activeSection = useSettingsStore((s) => s.activeSection);
  const activeSubSection = useSettingsStore((s) => s.activeSubSection);
  const setActiveSection = useSettingsStore((s) => s.setActiveSection);

  const handleSelectSection = (
    sectionId: SettingsSectionId,
    subSection?: string | null,
  ) => {
    setActiveSection(sectionId, subSection ?? null);
  };

  return (
    <aside className="flex h-auto w-full shrink-0 flex-col bg-sidebar sm:h-full sm:w-64">
      <ScrollArea className="min-h-0 flex-1">
        <nav className="space-y-6 p-3">
          {SETTINGS_NAV.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="px-2.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                {group.label}
              </p>

              {group.items.map((item) => {
                const isActive = activeSection === item.id;

                return (
                  <div key={item.id} className="space-y-1">
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
        </nav>
      </ScrollArea>
    </aside>
  );
}
