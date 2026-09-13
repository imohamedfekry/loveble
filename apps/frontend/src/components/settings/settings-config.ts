import type { LucideIcon } from "lucide-react";
import {
  BellIcon,
  PaletteIcon,
  PlugIcon,
  UserIcon,
} from "lucide-react";

export type SettingsSectionId =
  | "account"
  | "integrations"
  | "notifications"
  | "appearance";

export type SettingsSubSection = {
  id: string;
  label: string;
};

export type SettingsNavItem = {
  id: SettingsSectionId;
  label: string;
  icon: LucideIcon;
  subSections?: SettingsSubSection[];
};

export type SettingsNavGroup = {
  label: string;
  items: SettingsNavItem[];
};

export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = "account";

export const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    label: "User Settings",
    items: [
      {
        id: "account",
        label: "Account",
        icon: UserIcon,
        subSections: [
          { id: "profile", label: "Profile" },
          { id: "security", label: "Security" },
        ],
      },
      {
        id: "integrations",
        label: "Integrations",
        icon: PlugIcon,
        subSections: [{ id: "github", label: "GitHub" }],
      },
      {
        id: "notifications",
        label: "Notifications",
        icon: BellIcon,
        subSections: [{ id: "overview", label: "Overview" }],
      },
      {
        id: "appearance",
        label: "Appearance",
        icon: PaletteIcon,
      },
    ],
  },
];

export function getSettingsNavItem(sectionId: SettingsSectionId) {
  for (const group of SETTINGS_NAV) {
    const item = group.items.find((entry) => entry.id === sectionId);
    if (item) return item;
  }

  return null;
}
