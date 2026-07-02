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
        overlayClassName="bg-black/70 supports-backdrop-filter:backdrop-blur-sm"
        className="flex h-[min(90vh,calc(100vh-3rem))] max-h-[calc(100vh-3rem)] w-[min(90%,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] flex-row gap-0 overflow-hidden rounded-xl border-border/60 bg-background p-0 shadow-2xl sm:max-w-[calc(100vw-2rem)]"
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Manage your Squadra account and preferences.
        </DialogDescription>

        <SettingsSidebar />

        <div className="flex min-w-0 flex-1 flex-col bg-background">
          <header className="flex shrink-0 items-center justify-between border-b border-border/60 px-6 py-4">
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

          <ScrollArea className="min-h-0 flex-1">
            <div className="px-6 py-5">
              <SettingsContent />
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
