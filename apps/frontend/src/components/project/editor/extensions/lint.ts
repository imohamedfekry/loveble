import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { linter, lintGutter, type Diagnostic } from "@codemirror/lint";
import { jsonParseLinter } from "@codemirror/lang-json";
import type { SyntaxNode } from "@lezer/common";
import { copyableLintSource } from "./diagnostic-copy";

/**
 * Generic syntax-error linter.
 * Works for any language with a Lezer parser (JS/TS, HTML, CSS, JSON, Python, Markdown).
 * Walks the syntax tree and reports `⚠` / error nodes.
 */
const syntaxErrorLinter = (view: EditorView): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const tree = syntaxTree(view.state);

  tree.iterate({
    enter(node: SyntaxNode) {
      if (node.type.isError) {
        diagnostics.push({
          from: node.from,
          to: node.to,
          severity: "error",
          message: "Syntax error",
        });
      }
    },
  });

  return diagnostics;
};

/** JS/TS best-practice rules (regex per line, zero deps). */
const javascriptRulesLinter = (view: EditorView): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const doc = view.state.doc;

  for (let lineNo = 1; lineNo <= doc.lines; lineNo++) {
    const line = doc.line(lineNo);
    const text = line.text;
    const push = (
      match: RegExpExecArray,
      message: string,
      severity: Diagnostic["severity"],
    ) => {
      diagnostics.push({
        from: line.from + match.index,
        to: line.from + match.index + match[0].length,
        severity,
        message,
      });
    };

    let m: RegExpExecArray | null;

    // var -> let/const
    const varRe = /\bvar\s+[\w$]+\b/g;
    while ((m = varRe.exec(text))) {
      push(m, "Use `let` or `const` instead of `var`.", "warning");
    }

    // == / != without third char
    const eqRe = /([^=!<>])==([^=])|([^=!<>])!=([^=])/g;
    while ((m = eqRe.exec(text))) {
      push(m, "Use strict equality (`===` / `!==`).", "warning");
    }

    // eval()
    const evalRe = /\beval\s*\(/g;
    while ((m = evalRe.exec(text))) {
      push(m, "Avoid `eval()` — it is a security risk.", "error");
    }

    // console.log left in code
    const logRe = /\bconsole\.(log|debug)\s*\(/g;
    while ((m = logRe.exec(text))) {
      push(m, "Remove `console.log` before committing.", "info");
    }

    // debugger statement
    const dbgRe = /\bdebugger\b;?/g;
    while ((m = dbgRe.exec(text))) {
      push(m, "Remove `debugger` statement.", "warning");
    }

    // TODO / FIXME
    const todoRe = /\b(TODO|FIXME|XXX)\b:?/g;
    while ((m = todoRe.exec(text))) {
      push(m, `${m[1]} marker — resolve before merging.`, "info");
    }

    // any type (TS)
    const anyRe = /:\s*any\b/g;
    while ((m = anyRe.exec(text))) {
      push(m, "Avoid `any` — prefer a precise type or `unknown`.", "warning");
    }
  }

  return diagnostics;
};

/** CSS hints: !important overuse, empty rules are caught by syntax errors. */
const cssRulesLinter = (view: EditorView): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const doc = view.state.doc;

  for (let lineNo = 1; lineNo <= doc.lines; lineNo++) {
    const line = doc.line(lineNo);
    const importantRe = /!important/g;
    let m: RegExpExecArray | null;
    while ((m = importantRe.exec(line.text))) {
      diagnostics.push({
        from: line.from + m.index,
        to: line.from + m.index + m[0].length,
        severity: "info",
        message: "Avoid `!important` — it makes overrides hard to reason about.",
      });
    }
  }

  return diagnostics;
};

/** Python hints without a runtime: tabs, trailing space, long lines, print. */
const pythonRulesLinter = (view: EditorView): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const doc = view.state.doc;

  for (let lineNo = 1; lineNo <= doc.lines; lineNo++) {
    const line = doc.line(lineNo);
    const text = line.text;

    if (/^\t+/.test(text) || /^ +\t/.test(text)) {
      diagnostics.push({
        from: line.from,
        to: line.from + text.match(/^\s+/)![0].length,
        severity: "error",
        message: "Use spaces for indentation (PEP 8).",
      });
    }

    const trailing = text.match(/[ \t]+$/);
    if (trailing && text.length > 0) {
      diagnostics.push({
        from: line.from + text.length - trailing[0].length,
        to: line.to,
        severity: "info",
        message: "Trailing whitespace.",
      });
    }

    if (text.length > 100) {
      diagnostics.push({
        from: line.from + 100,
        to: line.to,
        severity: "warning",
        message: `Line too long (${text.length} > 100 characters).`,
      });
    }

    const printRe = /\bprint\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = printRe.exec(text))) {
      diagnostics.push({
        from: line.from + m.index,
        to: line.from + m.index + m[0].length,
        severity: "info",
        message: "Remove `print()` debugging before committing.",
      });
    }
  }

  return diagnostics;
};

/** YAML hints: tabs are forbidden, trailing space breaks clean diffs. */
const yamlRulesLinter = (view: EditorView): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const doc = view.state.doc;

  for (let lineNo = 1; lineNo <= doc.lines; lineNo++) {
    const line = doc.line(lineNo);
    const text = line.text;

    const tabRe = /\t/g;
    let m: RegExpExecArray | null;
    while ((m = tabRe.exec(text))) {
      diagnostics.push({
        from: line.from + m.index,
        to: line.from + m.index + 1,
        severity: "error",
        message: "YAML forbids tabs — use spaces for indentation.",
      });
    }

    const trailing = text.match(/[ \t]+$/);
    if (trailing && text.length > 0) {
      diagnostics.push({
        from: line.from + text.length - trailing[0].length,
        to: line.to,
        severity: "info",
        message: "Trailing whitespace.",
      });
    }
  }

  return diagnostics;
};

const combine =
  (fileName: string, ...sources: ((view: EditorView) => Diagnostic[])[]) =>
  copyableLintSource(
    (view: EditorView): Diagnostic[] => sources.flatMap((source) => source(view)),
    fileName,
  );

const copyable = (
  source: (view: EditorView) => Diagnostic[],
  fileName: string,
) => copyableLintSource(source, fileName);

export const lintTheme = EditorView.baseTheme({
  ".cm-lintRange-error": {
    backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='3'><path d='m0 2.5 2-2 2 2' stroke='%23ef4444' fill='none' stroke-width='.8'/></svg>")`,
    backgroundRepeat: "repeat-x",
    backgroundPosition: "bottom",
    paddingBottom: "1px",
  },
  ".cm-lintRange-warning": {
    backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='3'><path d='m0 2.5 2-2 2 2' stroke='%23eab308' fill='none' stroke-width='.8'/></svg>")`,
    backgroundRepeat: "repeat-x",
    backgroundPosition: "bottom",
    paddingBottom: "1px",
  },
  ".cm-lintRange-info": {
    backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='3'><path d='m0 2.5 2-2 2 2' stroke='%233b82f6' fill='none' stroke-width='.8'/></svg>")`,
    backgroundRepeat: "repeat-x",
    backgroundPosition: "bottom",
    paddingBottom: "1px",
  },
  ".cm-lintPoint-error::after": { borderBottomColor: "var(--destructive)" },
  ".cm-tooltip-lint": {
    backgroundColor: "var(--editor-tooltip-bg) !important",
    color: "var(--editor-tooltip-fg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    padding: "2px 8px",
    maxWidth: "28rem",
    userSelect: "text",
    cursor: "text",
  },
  ".cm-panel-lint ul": {
    userSelect: "text",
  },
  ".cm-diagnostic-copyable": {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  ".cm-diagnostic-copy-btn": {
    flexShrink: "0",
    font: "inherit",
    fontSize: "11px",
    lineHeight: "1",
    padding: "2px 5px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    backgroundColor: "var(--secondary)",
    color: "var(--secondary-foreground)",
    cursor: "pointer",
    opacity: "0.7",
    "&:hover": { opacity: "1" },
  },
});

/**
 * Returns lint extensions tailored to the file language.
 * JSON uses the built-in `jsonParseLinter` for precise messages,
 * other languages combine syntax-error detection with light custom rules.
 */
export const getLintExtension = (fileName: string): Extension => {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  const gutter = lintGutter();
  const delay = { delay: 350 };

  switch (ext) {
    case "json":
      return [linter(copyable(jsonParseLinter(), fileName), delay), gutter, lintTheme];
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
      return [
        linter(combine(fileName, syntaxErrorLinter, javascriptRulesLinter), delay),
        gutter,
        lintTheme,
      ];
    case "css":
      return [
        linter(combine(fileName, syntaxErrorLinter, cssRulesLinter), delay),
        gutter,
        lintTheme,
      ];
    case "py":
      return [
        linter(combine(fileName, syntaxErrorLinter, pythonRulesLinter), delay),
        gutter,
        lintTheme,
      ];
    case "html":
    case "xml":
    case "svg":
    case "md":
    case "mdx":
      return [linter(copyable(syntaxErrorLinter, fileName), delay), gutter, lintTheme];
    case "yaml":
    case "yml":
      return [
        linter(combine(fileName, syntaxErrorLinter, yamlRulesLinter), delay),
        gutter,
        lintTheme,
      ];
    default:
      return [linter(copyable(syntaxErrorLinter, fileName), delay), gutter, lintTheme];
  }
};
