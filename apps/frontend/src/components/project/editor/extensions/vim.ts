import { Compartment, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { vim } from "@replit/codemirror-vim";

export const VIM_MODE_STORAGE_KEY = "squadra:vim-mode";

/**
 * Compartment holding the vim keybindings so the mode can be toggled
 * at runtime without recreating the whole EditorView.
 */
export const vimCompartment = new Compartment();

/** Theme for the vim status/command panel (`:`, `/`, `-- NORMAL --`). */
export const vimTheme = EditorView.baseTheme({
  ".cm-vim-panel": {
    backgroundColor: "var(--editor-tooltip-bg)",
    color: "var(--editor-tooltip-fg)",
    borderBottom: "1px solid var(--border)",
    fontFamily: "var(--font-roboto-mono), monospace",
    fontSize: "12px",
    padding: "4px 12px",
  },
  ".cm-vim-panel input": {
    caretColor: "var(--editor-caret)",
    color: "var(--editor-tooltip-fg)",
  },
});

/**
 * Full vim emulation: modal editing (normal/insert/visual),
 * motions, operators, registers, macros, search (`/`, `?`, `n`),
 * ex commands (`:w`, `:s`, `:g`, `:sort`, `:set`, ...) and a status bar panel
 * (`status: true`) showing the current mode.
 */
export const vimModeExtension: Extension = [vim({ status: true }), vimTheme];

export const readVimModePreference = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(VIM_MODE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

export const writeVimModePreference = (enabled: boolean): void => {
  try {
    window.localStorage.setItem(VIM_MODE_STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // Storage unavailable (private mode, SSR) — vim mode just won't persist.
  }
};
