"use client";

import { useEffect } from "react";
import {
  isTypingTarget,
  matchesShortcut,
  type ModKeyCode,
} from "@/lib/keyboard";

export function useKeyboardShortcut(
  code: ModKeyCode,
  onTrigger: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (!matchesShortcut(event, code)) return;

      event.preventDefault();
      onTrigger();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [code, enabled, onTrigger]);
}
