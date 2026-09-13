import { createContext, useContext } from "react";
import type { CollisionDetection, UniqueIdentifier } from "@dnd-kit/core";
import type { ProjectFileType } from "@/lib/api/apis/files/types";

export const ROOT_DROP_ID = "__file-explorer-root__";

export const TreeDndContext = createContext<{ activeId: string | null }>({
  activeId: null,
});

export const useTreeDndContext = () => useContext(TreeDndContext);

export function getFileMap(files: ProjectFileType[]) {
  const map = new Map<string, ProjectFileType>();
  for (const file of files) map.set(file.id, file);
  return map;
}

export function isDescendant(
  files: ProjectFileType[],
  ancestorId: string,
  targetId: string,
) {
  const map = getFileMap(files);
  let current = map.get(targetId);
  while (current && current.parentId) {
    if (current.parentId === ancestorId) return true;
    current = map.get(current.parentId);
  }
  return false;
}

export function isValidDropTarget(
  files: ProjectFileType[],
  activeId: string | null,
  targetId: string,
) {
  if (!activeId) return false;
  if (activeId === targetId) return false;
  const target = getFileMap(files).get(targetId);
  if (!target || target.type !== "folder") return false;
  if (isDescendant(files, activeId, targetId)) return false;
  return true;
}

type DndRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

/**
 * Each folder claims a vertical "subtree band": from its own row down to the
 * bottom of its last visible descendant. A nested folder cuts its own band out
 * of its ancestors, so the deepest folder containing the pointer wins.
 * When no folder band contains the pointer, the Root is the target.
 */
export function createTreeCollisionDetection(
  allFiles: ProjectFileType[],
): CollisionDetection {
  const childrenOf = new Map<string, ProjectFileType[]>();
  const depthOf = new Map<string, number>();
  const typeOf = new Map<string, "file" | "folder">();

  for (const file of allFiles) {
    typeOf.set(file.id, file.type);
    if (file.parentId) {
      const siblings = childrenOf.get(file.parentId) ?? [];
      siblings.push(file);
      childrenOf.set(file.parentId, siblings);
    }
  }

  function getDepth(id: string): number {
    const cached = depthOf.get(id);
    if (cached !== undefined) return cached;
    const file = allFiles.find((f) => f.id === id);
    const depth = file?.parentId ? getDepth(file.parentId) + 1 : 0;
    depthOf.set(id, depth);
    return depth;
  }

  return ({ droppableRects, droppableContainers, pointerCoordinates }) => {
    if (!pointerCoordinates) return [];

    const px = pointerCoordinates.x;
    const py = pointerCoordinates.y;

    const rectOf = (id: UniqueIdentifier) => droppableRects.get(id) as
      | DndRect
      | undefined;

    const subtreeBottomCache = new Map<string, number>();

    function subtreeBottom(id: string): number | undefined {
      const cached = subtreeBottomCache.get(id);
      if (cached !== undefined) return cached;

      let bottom: number | undefined;
      const own = rectOf(id);
      if (own) bottom = own.bottom;

      const children = childrenOf.get(id) ?? [];
      for (const child of children) {
        if (child.type === "folder") {
          const childBottom = subtreeBottom(child.id);
          if (
            childBottom !== undefined &&
            (bottom === undefined || childBottom > bottom)
          ) {
            bottom = childBottom;
          }
        } else {
          const childRect = rectOf(child.id);
          if (childRect && (bottom === undefined || childRect.bottom > bottom)) {
            bottom = childRect.bottom;
          }
        }
      }

      if (bottom !== undefined) subtreeBottomCache.set(id, bottom);
      return bottom;
    }

    let bestFolderId: string | null = null;
    let bestDepth = -1;
    let bestSpan = Infinity;

    for (const container of droppableContainers) {
      if (container.id === ROOT_DROP_ID) continue;

      const id = String(container.id);
      if (typeOf.get(id) !== "folder") continue;

      const row = rectOf(id);
      if (!row) continue;
      if (px < row.left || px > row.right) continue;

      const bottom = subtreeBottom(id);
      if (bottom === undefined) continue;
      if (py < row.top || py > bottom) continue;

      const depth = getDepth(id);
      const span = bottom - row.top;
      if (depth > bestDepth || (depth === bestDepth && span < bestSpan)) {
        bestFolderId = id;
        bestDepth = depth;
        bestSpan = span;
      }
    }

    if (bestFolderId) {
      return [{ id: bestFolderId, data: { type: "folder" } }];
    }

    const rootRect = rectOf(ROOT_DROP_ID);
    if (
      rootRect &&
      px >= rootRect.left &&
      px <= rootRect.right &&
      py >= rootRect.top &&
      py <= rootRect.bottom
    ) {
      return [{ id: ROOT_DROP_ID, data: { type: "root" } }];
    }

    return [];
  };
}