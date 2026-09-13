import { create } from "zustand";
import {
  DEFAULT_SETTINGS_SECTION,
  type SettingsSectionId,
} from "@/components/settings/settings-config";

interface SettingsStore {
  isOpen: boolean;
  activeSection: SettingsSectionId;
  activeSubSection: string | null;
  openSettings: (
    section?: SettingsSectionId,
    subSection?: string | null,
  ) => void;
  closeSettings: () => void;
  setActiveSection: (
    section: SettingsSectionId,
    subSection?: string | null,
  ) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  isOpen: false,
  activeSection: DEFAULT_SETTINGS_SECTION,
  activeSubSection: null,

  openSettings: (section, subSection = null) =>
    set({
      isOpen: true,
      activeSection: section ?? DEFAULT_SETTINGS_SECTION,
      activeSubSection: subSection,
    }),

  closeSettings: () => set({ isOpen: false }),

  setActiveSection: (section, subSection = null) =>
    set({
      activeSection: section,
      activeSubSection: subSection,
    }),
}));
