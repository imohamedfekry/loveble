import { CATEGORY, FILE_TOOLS, MEMORY_TOOLS, SEARCH_TOOLS } from "./constants";
import type { Detail, ToolSection } from "./types";
import {
  inputString,
  inputValue,
  normalizePath,
  oneLine,
  toText,
} from "./utils";

export function sectionsFor(
  base: string,
  input: unknown,
  output: unknown,
): ToolSection[] {
  const sections: ToolSection[] = [];
  const push = (label: string, value: unknown) => {
    const text = toText(value);
    if (text) sections.push({ label, text });
  };
  const out =
    output && typeof output === "object"
      ? (output as Record<string, unknown>)
      : undefined;

  if (MEMORY_TOOLS.has(base)) {
    const memoryInput =
      typeof input === "string" ? input : inputValue(input, "memory");
    const memory = toText(memoryInput);
    if (memory) push("Memory", memory);
    else if (input !== undefined) push("Input", input);
    if (out?.message) push("Result", out.message);
    if (sections.length === 0 && output !== undefined) push("Result", output);
  } else if (base === "terminal" || base === "execute_command") {
    push("Command", inputValue(input, "command"));
    if (out) {
      push("Output", out.stdout ?? out.output);
      push("Errors", out.stderr);
      if (typeof out.exitCode === "number") {
        push("Exit code", String(out.exitCode));
      }
      push("Working directory", out.cwd);
      push("Error", out.error);
    } else if (output !== undefined) {
      push("Output", output);
    }
  } else if (base === "preview-read") {
    push("Path", inputValue(input, "path") ?? "/");
    if (out) {
      if (out.status !== undefined) push("HTTP status", String(out.status));
      push("Preview status", out.previewStatus);
      push("Response", out.content);
      if (out.truncated === true) {
        push("Note", "Response truncated to 20,000 characters.");
      }
      push("Error", out.error);
      push("Server log", out.logs);
    } else {
      push("Response", output);
    }
  } else if (base === "preview-logs") {
    if (out) {
      push("Preview status", out.previewStatus);
      push("Logs", out.logs);
      push("Error", out.error);
    } else {
      push("Logs", output);
    }
  } else if (base === "web-crawl") {
    push("URL", inputValue(input, "url"));
    push("Content", output);
  } else if (base === "get_process_output" || base === "kill_process") {
    push("Process", inputValue(input, "id") ?? inputValue(input, "processId"));
    push("Output", output);
  } else {
    push("Result", output);
    if (sections.length === 0) push("Input", input);
  }

  return sections;
}

export function detailFor(base: string, input: unknown): Detail | undefined {
  if (base === "execute_command" || base === "terminal") {
    const command = inputString(input, "command");
    return command ? { kind: "code", text: command } : undefined;
  }

  if (base === "preview-read") {
    const path = inputString(input, "path") ?? "/";
    return { kind: "code", text: path };
  }

  if (MEMORY_TOOLS.has(base)) {
    const memory = toText(
      typeof input === "string" ? input : inputValue(input, "memory"),
    );
    return memory ? { kind: "code", text: oneLine(memory) } : undefined;
  }

  if (base === "grep" || base === "search" || base === "web-search") {
    const pattern =
      inputString(input, "pattern") ??
      inputString(input, "query") ??
      inputString(input, "q");
    const path = inputString(input, "path");
    if (!pattern) return undefined;
    return {
      kind: "search",
      text: path && path !== "." ? `${pattern} in ${path}` : pattern,
    };
  }

  if (
    base === "read_file" ||
    base === "write_file" ||
    base === "edit_file" ||
    base === "ast_edit" ||
    base === "delete" ||
    base === "file_stat" ||
    base === "mkdir" ||
    base === "list_files"
  ) {
    const raw = inputString(input, "path");
    if (!raw) return undefined;
    const path = normalizePath(raw);
    const name = path.split("/").pop() || path;
    return {
      kind: "file",
      path,
      name,
      isFolder: base === "mkdir" || base === "list_files",
    };
  }

  const fallback = inputString(input, "query") ?? inputString(input, "url");
  return fallback ? { kind: "code", text: fallback } : undefined;
}

export function summarize(bases: string[]): string {
  const counts = { command: 0, read: 0, write: 0, search: 0, other: 0 };
  for (const base of bases) {
    counts[CATEGORY[base] ?? "other"] += 1;
  }

  const segments: string[] = [];
  if (counts.command) {
    segments.push(
      counts.command === 1 ? "Ran 1 command" : `Ran ${counts.command} commands`,
    );
  }
  if (counts.read) {
    segments.push(
      counts.read === 1 ? "read 1 file" : `read ${counts.read} files`,
    );
  }
  if (counts.write) {
    segments.push(
      counts.write === 1 ? "edited 1 file" : `edited ${counts.write} files`,
    );
  }
  if (counts.search) {
    segments.push(
      counts.search === 1
        ? "searched 1 time"
        : `searched ${counts.search} times`,
    );
  }
  if (counts.other) {
    segments.push(
      counts.other === 1 ? "ran 1 tool" : `ran ${counts.other} tools`,
    );
  }

  if (segments.length === 0) return "Ran tools";
  if (segments[0]!.startsWith("Ran ")) return segments.join(" · ");
  return [
    `Ran ${bases.length} ${bases.length === 1 ? "tool" : "tools"}`,
    ...segments,
  ].join(" · ");
}

/** Rebuild a row detail from a team tool's name + target string. */
export function detailFromTarget(
  base: string,
  target?: string,
): Detail | undefined {
  if (!target) return undefined;
  if (FILE_TOOLS.has(base)) {
    const path = normalizePath(target);
    const name = path.split("/").pop() || path;
    return {
      kind: "file",
      path,
      name,
      isFolder: base === "mkdir" || base === "list_files",
    };
  }
  if (SEARCH_TOOLS.has(base)) return { kind: "search", text: target };
  return { kind: "code", text: target };
}
