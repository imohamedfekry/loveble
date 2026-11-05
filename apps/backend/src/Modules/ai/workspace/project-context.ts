import type { FileRepository } from 'src/common/database/repositories/project/file.repository';
import { ProjectPathResolver } from './project-path.resolver';

/** Keep the snapshot bounded so the first prompt never balloons. */
const MAX_LISTED_PATHS = 400;

/**
 * Architecture of the starter every project begins with. Kept in one place so
 * the first turn, the builder prompt and the planner prompt never drift apart.
 */
const STARTER_FACTS = [
  'Stack: Next.js 16 (App Router, Turbopack, React 19, TypeScript) + pnpm, Node 24.',
  'Already present, never recreate from scratch:',
  '- package.json (scripts: dev, build, start, lint) and next.config.ts',
  '  (dev server on 0.0.0.0:3000 — do not change host/port).',
  '- tsconfig.json with the @/* alias pointing at ./src/*.',
  '- src/app/layout.tsx — the required root layout (<html>/<body>, metadata).',
  '- src/app/page.tsx — the only page; it is a placeholder, replace its content.',
  '- The starter ships no CSS: no Tailwind, no globals.css and no UI kit.',
  '  If the project already has a styling setup (older projects may), keep it.',
  '  Otherwise set up Tailwind v4 once when the app needs styling (tailwindcss +',
  '  @tailwindcss/postcss, postcss.config.mjs, src/app/globals.css imported in',
  '  the layout) or use CSS Modules / a plain global stylesheet. System font',
  '  stack — do not add remote web fonts.',
  'Conventions:',
  '- Add pages as src/app/<name>/page.tsx; use Link from next/link for navigation.',
  "- Server components by default; add 'use client' only for hooks, events or",
  '  browser APIs. Reusable UI in src/components, helpers in src/lib; import via @/... .',
  '- Route params/searchParams and cookies()/headers() are async in Next.js 16.',
  '- Installed deps are only next, react, react-dom (plus TypeScript/ESLint dev',
  '  tooling). No UI kit, icons or data library: install anything else explicitly',
  '  with `pnpm add <pkg>`.',
  '- Keep lovable.conf and next.config.ts untouched. Source files are edited',
  '  with the workspace file tools only (shell edits are wiped by the preview rebuild).',
];

/**
 * Compact snapshot of the project tree for the first agent turn.
 *
 * The agent workspace is database-backed (it never reads the sandbox directly),
 * so without this snapshot the model only discovers the existing template files
 * by calling tools — and in practice starts recreating the scaffold file by
 * file. Prepending the current structure to the first user message gives it the
 * base context it needs before it decides what to build.
 */
export async function buildProjectStructureContext(
  fileRepository: FileRepository,
  projectId: bigint,
): Promise<string | null> {
  const files = await fileRepository.getAllFilesWithProjectId(projectId);
  const resolver = new ProjectPathResolver(projectId, files);
  const paths = files
    .filter((file) => file.type === 'file')
    .map((file) => resolver.pathOfId(file.id.toString()))
    .filter((path): path is string => typeof path === 'string')
    .sort();

  if (paths.length === 0) return null;

  const listed = paths.slice(0, MAX_LISTED_PATHS);
  const omitted = paths.length - listed.length;

  return [
    '<project_context>',
    'The workspace at /home/user/app already contains this scaffold. Inspect it',
    'before writing and extend it — do not rebuild it file by file.',
    '',
    ...STARTER_FACTS,
    '',
    `Current project files (${paths.length}):`,
    ...listed.map((path) => `- ${path}`),
    ...(omitted > 0 ? [`- (+${omitted} more files)`] : []),
    '',
    'Keep the existing lovable.conf start/stop/health commands intact and verify',
    'your changes with `pnpm exec tsc --noEmit` / `pnpm run build` before claiming',
    'the work is done.',
    '</project_context>',
  ].join('\n');
}
