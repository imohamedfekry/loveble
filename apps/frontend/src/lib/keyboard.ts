export const MOD_KEY_CODES = {
  K: "KeyK",
  J: "KeyJ",
  I: "KeyI",
} as const;

export type ModKeyCode = (typeof MOD_KEY_CODES)[keyof typeof MOD_KEY_CODES];

export function isMacOS(): boolean {
  if (typeof navigator === "undefined") return false;

  return /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
}

export function getModKeyLabel(isMac = isMacOS()): string {
  return isMac ? "⌘" : "Ctrl";
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

export function matchesShortcut(event: KeyboardEvent, code: ModKeyCode): boolean {
  if (!event.metaKey && !event.ctrlKey) return false;
  if (event.altKey) return false;

  return event.code === code;
}
