"use client";

import { useSettingsStore } from "@/store/settings.store";
import type { SettingsSectionId } from "./settings-config";

export function useSettings() {
  const isOpen = useSettingsStore((s) => s.isOpen);
  const activeSection = useSettingsStore((s) => s.activeSection);
  const openSettings = useSettingsStore((s) => s.openSettings);
  const closeSettings = useSettingsStore((s) => s.closeSettings);
  const setActiveSection = useSettingsStore((s) => s.setActiveSection);

  return {
    isOpen,
    activeSection,
    openSettings: (
      section?: SettingsSectionId,
      subSection?: string | null,
    ) => openSettings(section, subSection),
    closeSettings,
    setActiveSection,
  };
}
