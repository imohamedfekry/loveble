"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettingsStore } from "@/store/settings.store";
import { XIcon } from "lucide-react";
import { getSettingsNavItem } from "./settings-config";
import { SettingsContent } from "./settings-content";
import { SettingsSidebar } from "./settings-sidebar";

export function SettingsModal() {
  const isOpen = useSettingsStore((s) => s.isOpen);
  const activeSection = useSettingsStore((s) => s.activeSection);
  const closeSettings = useSettingsStore((s) => s.closeSettings);
  const setOpen = (open: boolean) => {
    if (!open) closeSettings();
  };

  const navItem = getSettingsNavItem(activeSection);
  const sectionTitle = navItem?.label ?? "Settings";

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-foreground/30"
        className="flex h-[92vh] max-h-[92vh] w-[calc(100vw-1rem)] !max-w-[1140px] flex-col overflow-hidden rounded-xl border border-border/40 bg-card p-0 shadow-lg sm:h-[min(88vh,780px)] sm:max-h-[calc(100vh-2rem)] sm:w-[min(96vw,1140px)] sm:!max-w-[1140px] sm:flex-row"
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Manage your loveble account and preferences.
        </DialogDescription>

        <SettingsSidebar />

        <div className="flex min-w-0 flex-1 flex-col bg-card sm:border-l sm:border-border/40">
          <header className="flex shrink-0 items-center justify-between border-b border-border/40 bg-card px-8 py-5">
            <h2 className="text-lg font-semibold text-foreground">
              {sectionTitle}
            </h2>

            <DialogClose
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground"
                />
              }
            >
              <XIcon />
              <span className="sr-only">Close settings</span>
            </DialogClose>
          </header>

          <ScrollArea className="min-h-0 flex-1 bg-card">
            <div className="px-8 py-6">
              <SettingsContent />
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
