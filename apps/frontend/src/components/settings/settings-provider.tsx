"use client";

import { SettingsModal } from "./settings-modal";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SettingsModal />
    </>
  );
}
