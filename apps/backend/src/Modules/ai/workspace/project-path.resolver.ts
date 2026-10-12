import type { File } from 'src/common/database/schema/projects/file.schema';

export type ProjectNode = {
  id: string;
  parentId: string | null;
  name: string;
  type: 'file' | 'folder';
  storageKey: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Maps the flat `files` rows of a single project onto a POSIX-like tree so an
 * agent's workspace filesystem can resolve `/src/app.ts` → file id.
 *
 * Paths are stored WITHOUT a leading slash and without any `./` prefix
 * ("src/app.ts", "README.md"). The root directory is the empty string "".
 * This matches how the Mastra workspace tools build paths during a directory
 * walk (`dir === "." ? "./name" : dir + "/" + name`), which we normalize.
 */
export class ProjectPathResolver {
  private readonly byPath = new Map<string, ProjectNode>();
  private readonly byId = new Map<string, ProjectNode>();
  private readonly pathMemo = new Map<string, string>();
  private readonly childrenByParent = new Map<string, ProjectNode[]>();

  constructor(
    readonly projectId: bigint,
    files: File[],
  ) {
    const nodes: ProjectNode[] = files.map((file) => ({
      id: file.id.toString(),
      parentId: file.parentId === null ? null : file.parentId.toString(),
      name: file.name,
      type: file.type,
      storageKey: file.storageKey ?? null,
      version: file.version,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    }));

    for (const node of nodes) this.byId.set(node.id, node);

    // Children grouped by parent ("root" = null parent).
    for (const node of nodes) {
      const key = node.parentId ?? 'root';
      const bucket = this.childrenByParent.get(key) ?? [];
      bucket.push(node);
      this.childrenByParent.set(key, bucket);
    }

    for (const node of nodes) {
      this.byPath.set(this.pathOf(node), node);
    }
  }

  /** Resolve a node's full path by walking up the parent chain. */
  private pathOf(node: ProjectNode): string {
    const existing = this.pathMemo.get(node.id);
    if (existing !== undefined) return existing;
    if (node.parentId === null) {
      this.pathMemo.set(node.id, node.name);
      return node.name;
    }
    const parent = this.byId.get(node.parentId);
    const resolved = parent ? `${this.pathOf(parent)}/${node.name}` : node.name;
    this.pathMemo.set(node.id, resolved);
    return resolved;
  }

  /** Full project-relative path for a file/folder id (undefined if unknown). */
  pathOfId(id: string): string | undefined {
    const node = this.byId.get(id);
    if (!node) return undefined;
    return this.pathOf(node);
  }

  /** Normalize any agent-supplied path to the resolver's key form. */
  static normalize(path: string): string {
    const withoutLeading = path.replace(/^\/+/, '').replace(/^\.\/+/, '');
    const segments = withoutLeading
      .split('/')
      .filter((segment) => segment.length > 0 && segment !== '.');
    return segments.join('/');
  }

  resolve(path: string): ProjectNode | undefined {
    return this.byPath.get(ProjectPathResolver.normalize(path));
  }

  children(path: string): ProjectNode[] {
    const normalized = ProjectPathResolver.normalize(path);
    const parentKey =
      normalized === '' ? 'root' : this.byPath.get(normalized)?.id;
    if (!parentKey) return [];
    return this.childrenByParent.get(parentKey) ?? [];
  }

  /** Children of a node by its id (used during recursive deletes). */
  childrenOf(parentId: string): ProjectNode[] {
    return this.childrenByParent.get(parentId) ?? [];
  }

  isRoot(path: string): boolean {
    return ProjectPathResolver.normalize(path) === '';
  }

  /** True when a node exists at the path and is a folder (the root counts). */
  isDirectory(path: string): boolean {
    const normalized = ProjectPathResolver.normalize(path);
    if (normalized === '') return true;
    return this.byPath.get(normalized)?.type === 'folder';
  }
}
