import {
  normalizeToolBase,
  TOOL_LABELS,
  WORKSPACE_PREFIX,
} from "./constants";
import type { ToolPart } from "./types";

export function toolBase(part: ToolPart): string {
  const raw =
    part.toolName ??
    (part.type.startsWith("tool-") ? part.type.slice(5) : part.type);
  const base = raw.startsWith(WORKSPACE_PREFIX)
    ? raw.slice(WORKSPACE_PREFIX.length)
    : raw;
  return normalizeToolBase(base);
}

export function prettify(base: string): string {
  return base
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());
}

/** Mastra reports create vs update in the write output — mirror it in the label. */
export function labelFor(part: ToolPart, base: string): string {
  if (base === "write_file" || base === "edit_file" || base === "ast_edit") {
    const output = typeof part.output === "string" ? part.output : "";
    if (output.startsWith("Created ")) return "Create file";
    if (output.startsWith("Updated ")) return "Update file";
  }
  return TOOL_LABELS[base] ?? prettify(base);
}

export function normalizePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/^(\.\/|\/)+/, "")
    .split("/")
    .filter(Boolean)
    .join("/");
}

export function inputString(input: unknown, key: string): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const value = (input as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

export function inputValue(input: unknown, key: string): unknown {
  if (!input || typeof input !== "object") return undefined;
  return (input as Record<string, unknown>)[key];
}

export function toText(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value.trim() ? value : undefined;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function oneLine(value: string, max = 90): string {
  const line = value.replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max)}…` : line;
}
