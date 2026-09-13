import type { ProjectFileType } from "@/lib/api/apis/files/types";

/**
 * Presentation-layer node. Never touches the raw file data — it is derived
 * from the flat project files list and rebuilt automatically whenever the
 * store changes (create / delete / move / rename / realtime events).
 */
export type CompactTreeNode =
    | {
          kind: "file";
          id: string;
          item: ProjectFileType;
      }
    | {
          kind: "folder";
          id: string;
          item: ProjectFileType;
          children: CompactTreeNode[];
      }
    | {
          kind: "chain";
          id: string;
          chain: ProjectFileType[];
          label: string;
          children: CompactTreeNode[];
      };

/**
 * Build a display tree from the flat project files list, merging chains of
 * folders that contain exactly one child folder and nothing else.
 *
 * The merge starts from the first folder matching the condition and stops at
 * the first folder that contains files or more than one child. The resulting
 * chain keeps the LAST folder as the real node (expandable/collapsible,
 * context menu target); expanding shows only its direct children.
 */
export function buildCompactTree(
    files: ProjectFileType[],
    rootParentId: string | null,
): CompactTreeNode[] {
    const childrenByParent = new Map<string | null, ProjectFileType[]>();

    for (const file of files) {
        const list = childrenByParent.get(file.parentId);
        if (list) {
            list.push(file);
        } else {
            childrenByParent.set(file.parentId, [file]);
        }
    }

    const childrenOf = (parentId: string | null): ProjectFileType[] =>
        childrenByParent.get(parentId) ?? [];

    const buildChildren = (parentId: string | null): CompactTreeNode[] =>
        childrenOf(parentId).map((item) => buildNode(item));

    const buildNode = (item: ProjectFileType): CompactTreeNode => {
        if (item.type === "file") {
            return { kind: "file", id: item.id, item };
        }

        const chain = [item];
        let current = item;

        while (true) {
            const children = childrenOf(current.id);
            if (children.length === 1 && children[0].type === "folder") {
                current = children[0];
                chain.push(current);
            } else {
                break;
            }
        }

        const children = buildChildren(current.id);

        if (chain.length === 1) {
            return { kind: "folder", id: item.id, item, children };
        }

        return {
            kind: "chain",
            id: item.id,
            chain,
            label: chain.map((folder) => folder.name).join("/"),
            children,
        };
    };

    return buildChildren(rootParentId);
}
