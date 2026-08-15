"use client";

import { useSyncExternalStore } from "react";
import { getModKeyLabel, isMacOS } from "@/lib/keyboard";

export function useModKeyLabel() {
  const subscribe = () => () => {};

  return useSyncExternalStore(
    subscribe,
    () => getModKeyLabel(isMacOS()),
    () => "Ctrl",
  );
}
