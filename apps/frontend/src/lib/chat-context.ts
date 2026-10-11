import { getFilePath } from "@/lib/hooks/use-editor";
import { useFilesStore } from "@/store/file.store";
import type { ProjectFileType } from "@/lib/api/apis/files/types";
import type { ChatContextItem } from "@/store/chat-context.store";

export const MENTION_PATTERN = /@\[([^\]]+)\]/g;

export function resolveProjectPath(projectId: string, fileId: string): string {
  const files = useFilesStore.getState().files[projectId] ?? [];
  return getFilePath(files, fileId)
    .map((segment) => segment.name)
    .join("/");
}

export function fileMention(
  item: ProjectFileType,
): Omit<ChatContextItem, "id"> {
  const path = resolveProjectPath(item.projectId, item.id) || item.name;
  return {
    kind: item.type === "folder" ? "folder" : "file",
    projectId: item.projectId,
    fileId: item.id,
    path,
    name: item.name,
    type: item.type,
  };
}

export function mentionToken(item: ChatContextItem): string {
  if (item.kind === "selection") {
    return `@[${item.path}:${item.lineStart}-${item.lineEnd}]`;
  }
  if (item.kind === "folder") {
    return `@[${item.path}/]`;
  }
  return `@[${item.path}]`;
}

export function formatMentions(items: ChatContextItem[]): string {
  if (items.length === 0) return "";
  return `\n\n${items.map(mentionToken).join("\n")}`;
}

function pathOf(
  file: ProjectFileType,
  byId: Map<string, ProjectFileType>,
): string {
  const segments: string[] = [];
  let current: ProjectFileType | undefined = file;
  while (current) {
    segments.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return segments.join("/");
}

export function filePathMap(files: ProjectFileType[]): Map<string, string> {
  const byId = new Map(files.map((file) => [file.id, file]));
  const paths = new Map<string, string>();
  for (const file of files) {
    paths.set(file.id, pathOf(file, byId));
  }
  return paths;
}

export function fileIdByPath(
  files: ProjectFileType[],
  path: string,
): string | undefined {
  const byId = new Map(files.map((file) => [file.id, file]));
  for (const file of files) {
    if (file.type !== "file") continue;
    if (pathOf(file, byId) === path) return file.id;
  }
  return undefined;
}
