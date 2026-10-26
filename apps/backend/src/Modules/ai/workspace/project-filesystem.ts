import {
  DirectoryNotFoundError,
  FileNotFoundError,
  IsDirectoryError,
  NotDirectoryError,
  WorkspaceReadOnlyError,
  type FileContent,
  type FileEntry,
  type FileStat,
  type ProviderStatus,
  type ReadOptions,
  type WorkspaceFilesystem,
} from '@mastra/core/workspace';

import type { DocumentStateService } from '../../realtime/core/document-state.service';
import type { ProjectPathResolver, ProjectNode } from './project-path.resolver';

/**
 * Write operations delegate here (implemented by `ProjectMutationsService`),
 * which routes changes through the collaboration pipeline so open editors stay
 * in sync and content is persisted through the normal Inngest flow.
 */
export type ProjectMutations = {
  writeFile(path: string, content: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  /** Delete a file or folder (recursively) — the tree the delete tool needs. */
  deletePath(path: string, recursive?: boolean): Promise<void>;
};

const TEXT_EXTENSIONS = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'json',
  'jsonc',
  'html',
  'htm',
  'css',
  'scss',
  'sass',
  'less',
  'md',
  'mdx',
  'txt',
  'yml',
  'yaml',
  'toml',
  'ini',
  'cfg',
  'conf',
  'xml',
  'svg',
  'env',
  'gitignore',
  'lock',
  'graphql',
  'gql',
  'sql',
  'sh',
  'py',
  'rb',
  'go',
  'rs',
  'java',
  'php',
  'vue',
  'svelte',
  'prisma',
]);

const MIME_BY_EXTENSION: Record<string, string> = {
  json: 'application/json',
  jsonc: 'application/json',
  md: 'text/markdown',
  mdx: 'text/markdown',
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  csv: 'text/csv',
  svg: 'image/svg+xml',
  yml: 'application/yaml',
  yaml: 'application/yaml',
};

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot === -1 ? '' : filename.slice(dot + 1).toLowerCase();
}

function isTextExtension(filename: string): boolean {
  const ext = extensionOf(filename);
  if (ext === '') return true;
  return TEXT_EXTENSIONS.has(ext);
}

/**
 * A Mastra `WorkspaceFilesystem` backed by a Loveble project.
 *
 * Reads go through `DocumentStateService` so the agent always sees the same
 * content the collaborative editor does (Redis hot state, lazily hydrated from
 * S3). This is the read-only provider used by plan mode; build mode layers
 * mutations on top (routed through the collab pipeline so open editors stay in
 * sync).
 */
export class ProjectFilesystem implements WorkspaceFilesystem {
  readonly id: string;
  readonly name = 'ProjectFilesystem';
  readonly provider = 'loveble-project';
  readonly readOnly: boolean;
  status: ProviderStatus = 'ready';
  private resolver: ProjectPathResolver;

  constructor(
    private readonly options: {
      id: string;
      resolver: ProjectPathResolver;
      documentState: DocumentStateService;
      readOnly: boolean;
      mutations?: ProjectMutations;
      /** Re-reads the project tree so writes to new paths become visible. */
      reload?: () => Promise<ProjectPathResolver>;
    },
  ) {
    this.id = options.id;
    this.readOnly = options.readOnly;
    this.resolver = options.resolver;
  }

  isTextFile(filename: string): boolean {
    return isTextExtension(filename);
  }

  private requireNode(path: string): ProjectNode {
    const node = this.resolver.resolve(path);
    if (!node) throw new FileNotFoundError(path);
    return node;
  }

  private mutations(): ProjectMutations {
    if (!this.options.mutations) {
      throw new WorkspaceReadOnlyError('write');
    }
    return this.options.mutations;
  }

  private async refreshResolver(): Promise<void> {
    if (this.options.reload) {
      this.resolver = await this.options.reload();
    }
  }

  private async readContent(node: ProjectNode): Promise<string> {
    const { doc } = await this.options.documentState.getDocument(node.id);
    return doc;
  }

  async readFile(
    path: string,
    options?: ReadOptions,
  ): Promise<string | Buffer> {
    const node = this.requireNode(path);
    if (node.type === 'folder') throw new IsDirectoryError(path);
    if (node.isBinary) {
      throw new Error(`Binary file cannot be read as text: ${path}`);
    }
    const content = await this.readContent(node);
    const encoding = options?.encoding;
    if (!encoding || encoding === 'utf-8' || encoding === 'utf8') {
      return content;
    }
    const buffer = Buffer.from(content, 'utf-8');
    return buffer.toString(encoding === 'binary' ? 'latin1' : encoding);
  }

  readdir(path: string): Promise<FileEntry[]> {
    if (!this.resolver.isRoot(path) && !this.resolver.isDirectory(path)) {
      if (this.resolver.resolve(path)) throw new NotDirectoryError(path);
      throw new DirectoryNotFoundError(path);
    }
    const entries = this.resolver.children(path).map((node) => ({
      name: node.name,
      type: node.type === 'folder' ? ('directory' as const) : ('file' as const),
    }));
    return Promise.resolve(entries);
  }

  exists(path: string): Promise<boolean> {
    if (this.resolver.isRoot(path)) return Promise.resolve(true);
    return Promise.resolve(this.resolver.resolve(path) !== undefined);
  }

  async stat(path: string): Promise<FileStat> {
    if (this.resolver.isRoot(path)) {
      return {
        name: '',
        path: '/',
        type: 'directory',
        size: 0,
        createdAt: new Date(0),
        modifiedAt: new Date(0),
      };
    }
    const node = this.requireNode(path);
    if (node.type === 'folder') {
      return {
        name: node.name,
        path,
        type: 'directory',
        size: 0,
        createdAt: node.createdAt,
        modifiedAt: node.updatedAt,
      };
    }
    const content = await this.readContent(node);
    return {
      name: node.name,
      path,
      type: 'file',
      size: Buffer.byteLength(content, 'utf-8'),
      createdAt: node.createdAt,
      modifiedAt: node.updatedAt,
      mimeType: MIME_BY_EXTENSION[extensionOf(node.name)],
    };
  }

  async writeFile(path: string, content: FileContent): Promise<void> {
    if (this.readOnly) throw new WorkspaceReadOnlyError('write_file');
    const text =
      typeof content === 'string' ? content : content.toString('utf-8');
    await this.mutations().writeFile(path, text);
    await this.refreshResolver();
  }

  async appendFile(path: string, content: FileContent): Promise<void> {
    const existing = this.resolver.resolve(path);
    const contentText =
      typeof content === 'string' ? content : content.toString('utf-8');
    if (!existing) {
      await this.writeFile(path, contentText);
      return;
    }
    const prefix = String(await this.readFile(path, { encoding: 'utf-8' }));
    await this.writeFile(path, prefix + contentText);
  }

  async deleteFile(
    path: string,
    options?: { recursive?: boolean },
  ): Promise<void> {
    if (this.readOnly) throw new WorkspaceReadOnlyError('delete_file');
    await this.mutations().deletePath(path, options?.recursive ?? false);
    await this.refreshResolver();
  }

  copyFile(): Promise<void> {
    throw new WorkspaceReadOnlyError(
      'copy_file is not supported for project files',
    );
  }

  moveFile(): Promise<void> {
    throw new WorkspaceReadOnlyError(
      'move_file is not supported for project files',
    );
  }

  async mkdir(path: string): Promise<void> {
    if (this.readOnly) throw new WorkspaceReadOnlyError('mkdir');
    await this.mutations().mkdir(path);
    await this.refreshResolver();
  }

  async rmdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    if (this.readOnly) throw new WorkspaceReadOnlyError('rmdir');
    await this.mutations().deletePath(path, options?.recursive ?? false);
    await this.refreshResolver();
  }
}
