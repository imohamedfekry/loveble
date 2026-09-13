"use client";

import { cn } from "@loveble/utils";
import { useModKeyLabel } from "./useModKeyLabel";
import { Kbd } from "./kbd";

type ShortcutKbdProps = {
  keyLetter: string;
  className?: string;
};

export function ShortcutKbd({ keyLetter, className }: ShortcutKbdProps) {
  const modKey = useModKeyLabel();

  return (
    <Kbd className={cn("rounded-md border bg-accent/60", className)}>
      {modKey} + {keyLetter.toUpperCase()}
    </Kbd>
  );
}
