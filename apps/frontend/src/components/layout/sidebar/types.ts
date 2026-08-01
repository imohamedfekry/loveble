import type React from "react";

export type IconType = React.ComponentType<{ className?: string }>;

export type NavEntry = {
  icon: IconType;
  label: string;
  shortcut?: string;
  active?: boolean;
};