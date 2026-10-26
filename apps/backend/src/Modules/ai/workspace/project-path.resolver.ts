import type { File } from 'src/common/database/schema/projects/file.schema';

export type ProjectNode = {
  id: string;
  parentId: string | null;
  name: string;
  type: 'file' | 'folder';
  storageKey: string | null;
  contentType: string;
  size: number;
  checksum: string | null;
  isBinary: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

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
      contentType: file.contentType,
      size: file.size,
      checksum: file.checksum ?? null,
      isBinary: file.isBinary,
      version: file.version,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    }));

    for (const node of nodes) this.byId.set(node.id, node);

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

  pathOfId(id: string): string | undefined {
    const node = this.byId.get(id);
    if (!node) return undefined;
    return this.pathOf(node);
  }

  nodeOfId(id: string): ProjectNode | undefined {
    return this.byId.get(id);
  }

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

  childrenOf(parentId: string): ProjectNode[] {
    return this.childrenByParent.get(parentId) ?? [];
  }

  isRoot(path: string): boolean {
    return ProjectPathResolver.normalize(path) === '';
  }

  isDirectory(path: string): boolean {
    const normalized = ProjectPathResolver.normalize(path);
    if (normalized === '') return true;
    return this.byPath.get(normalized)?.type === 'folder';
  }
}
