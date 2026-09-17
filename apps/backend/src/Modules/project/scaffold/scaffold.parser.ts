import type { RawScaffold, Scaffold, ScaffoldFile } from './scaffold.types';

export const MAX_SCAFFOLD_FILES = 24;
export const MAX_FILE_CONTENT_LENGTH = 200_000;
export const MAX_PROJECT_NAME_LENGTH = 100;
const MAX_DEFAULT_NAME_WORDS = 5;

export function normalizePath(path: string): string {
  return path.replace(/^\/+/, '').replace(/\\/g, '/');
}

/** Parse and coerce the model's raw JSON payload into a Scaffold. */
export function parseScaffoldResponse(raw: string): Scaffold {
  const cleaned = raw.replace(/```(?:json)?/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new Error('Model did not return a valid JSON object');
  }
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as RawScaffold;
  const files = (parsed.files ?? [])
    .map(toScaffoldFile)
    .filter((file) => file.path.length > 0);
  return {
    ...(typeof parsed.name === 'string' && parsed.name.trim()
      ? { name: parsed.name.trim() }
      : {}),
    files,
  };
}

/** Enforce hard limits and de-duplicate paths before anything touches the DB. */
export function sanitizeScaffold(scaffold: Scaffold): Scaffold {
  const seen = new Set<string>();
  const files: ScaffoldFile[] = [];
  for (const file of scaffold.files.slice(0, MAX_SCAFFOLD_FILES)) {
    const path = normalizePath(file.path);
    if (!path || seen.has(path)) continue;
    seen.add(path);
    files.push({
      path,
      content: file.content.slice(0, MAX_FILE_CONTENT_LENGTH),
    });
  }
  return {
    ...(scaffold.name
      ? { name: scaffold.name.slice(0, MAX_PROJECT_NAME_LENGTH) }
      : {}),
    files,
  };
}

/** Unique folder paths (as segment arrays) needed by the given files,
 *  ordered shallowest-first so parents always exist before their children. */
export function collectFolderPaths(files: ScaffoldFile[]): string[][] {
  const folders = new Set<string>();
  for (const file of files) {
    const segments = normalizePath(file.path).split('/').filter(Boolean);
    segments.pop();
    let path = '';
    for (const segment of segments) {
      path = path ? `${path}/${segment}` : segment;
      folders.add(path);
    }
  }
  return [...folders]
    .sort((a, b) => a.split('/').length - b.split('/').length)
    .map((path) => path.split('/'));
}

/** Instant placeholder name from the prompt while generation is running. */
export function deriveDefaultName(prompt: string): string {
  const words = prompt.split(/\s+/).slice(0, MAX_DEFAULT_NAME_WORDS).join(' ');
  return words.length > 3 ? `${words}...` : words;
}

function toScaffoldFile(file: unknown): ScaffoldFile {
  if (typeof file !== 'object' || file === null) {
    return { path: '', content: '' };
  }
  const candidate = file as { path?: unknown; content?: unknown };
  return {
    path:
      typeof candidate.path === 'string' ? normalizePath(candidate.path) : '',
    content: typeof candidate.content === 'string' ? candidate.content : '',
  };
}
