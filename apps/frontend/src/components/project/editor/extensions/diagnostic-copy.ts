/**
 * Makes lint diagnostics copyable for debugging.
 *
 * @codemirror/lint renders every diagnostic (hover tooltip, gutter tooltip
 * AND the lint panel) through `diagnostic.renderMessage` when present.
 * Attaching one here covers all three surfaces at once.
 *
 * The copied text is a compact single line, e.g.
 * `[error] app.ts:12:5 TS2451: Cannot redeclare block-scoped variable 'total'.`
 * so it can be pasted straight into a chat / issue / AI prompt.
 */
import type { EditorView } from "@codemirror/view";
import type { Diagnostic } from "@codemirror/lint";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for non-secure contexts / denied permissions.
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function formatDiagnostic(
  view: EditorView,
  diagnostic: Diagnostic,
  fileName?: string,
): string {
  const doc = view.state.doc;
  const from = Math.max(0, Math.min(diagnostic.from, doc.length));
  const line = doc.lineAt(from);
  const col = from - line.from + 1;
  const where = fileName ? `${fileName}:${line.number}:${col}` : `${line.number}:${col}`;
  const source = diagnostic.source ? ` [${diagnostic.source}]` : "";
  return `[${diagnostic.severity}] ${where}${source} ${diagnostic.message}`;
}

function renderCopyableMessage(
  view: EditorView,
  diagnostic: Diagnostic,
  fileName?: string,
): HTMLElement {
  const wrap = document.createElement("span");
  wrap.className = "cm-diagnostic-copyable";

  const text = document.createElement("span");
  text.className = "cm-diagnosticText";
  text.textContent = diagnostic.message;
  wrap.appendChild(text);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cm-diagnostic-copy-btn";
  btn.title = "Copy error for debugging";
  btn.setAttribute("aria-label", "Copy diagnostic message");
  btn.textContent = "⧉";
  // Don't steal editor focus / selection when pressed inside a tooltip.
  btn.onmousedown = (e) => e.preventDefault();
  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const payload = formatDiagnostic(view, diagnostic, fileName);
    void copyText(payload).then((ok) => {
      btn.textContent = ok ? "✓" : "✕";
      setTimeout(() => {
        btn.textContent = "⧉";
      }, 1200);
    });
  };
  wrap.appendChild(btn);

  return wrap;
}

/** Attach a copyable `renderMessage` to a diagnostic (idempotent). */
export function withCopyableMessage(
  view: EditorView,
  diagnostic: Diagnostic,
  fileName?: string,
): Diagnostic {
  if (diagnostic.renderMessage) return diagnostic;
  return {
    ...diagnostic,
    renderMessage: () => renderCopyableMessage(view, diagnostic, fileName),
  };
}

/**
 * Wrap a lint source so every diagnostic it produces becomes copyable.
 * Apply at the `linter(...)` call sites.
 */
export function copyableLintSource(
  source: (view: EditorView) => Diagnostic[],
  fileName?: string,
): (view: EditorView) => Diagnostic[] {
  return (view: EditorView) => source(view).map((d) => withCopyableMessage(view, d, fileName));
}