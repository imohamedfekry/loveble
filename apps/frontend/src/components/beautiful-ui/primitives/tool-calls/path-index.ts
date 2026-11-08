import type { ProjectFileType } from "@/lib/api/apis/files/types";

import { normalizePath } from "./utils";

/** Map of project-relative path → node, so tool paths resolve to openable files. */
export function buildPathIndex(
  files: ProjectFileType[],
): Map<string, ProjectFileType> {
  const byId = new Map(files.map((file) => [file.id, file]));

  const resolve = (file: ProjectFileType, depth: number): string => {
    if (!file.parentId || depth > 64) return file.name;
    const parent = byId.get(file.parentId);
    if (!parent) return file.name;
    return `${resolve(parent, depth + 1)}/${file.name}`;
  };

  const index = new Map<string, ProjectFileType>();
  for (const file of files) {
    index.set(normalizePath(resolve(file, 0)), file);
  }
  return index;
}
