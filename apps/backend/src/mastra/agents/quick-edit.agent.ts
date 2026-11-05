import { Agent } from '@mastra/core/agent';
import { DEFAULT_AGENT_MODEL, getModel } from 'src/ai/providers';

/**
 * Backs the editor's inline "Quick Edit". It edits the real project file through
 * the same workspace + mutation pipeline the builder agent uses in chat, so the
 * change lands in the project (and open editors sync over collaboration).
 *
 * Intentionally has NO memory: quick edits must never be written into a chat
 * thread or leak into the conversation history.
 */
export const quickEditAgent = new Agent({
  id: 'quick-edit-agent',
  name: 'quick-edit-agent',
  instructions: `You apply a single, focused edit to one file in the project.

You are given a target file path, an optional selected line range, and an instruction from the developer looking at that file.

Rules:
- Read the target file first, then apply the change in place at that exact path.
- If a line range is given, keep the change inside it unless the instruction clearly needs code outside it (for example an import at the top of the file).
- This is a Next.js 16 App Router (React 19, TypeScript) project: keep its conventions (pages under src/app, server components by default, next/link for navigation, 'use client' only when hooks or browser APIs are needed). The starter ships no CSS: follow whatever styling the project already uses (Tailwind classes, CSS Modules, or a global stylesheet) and stay consistent with the file you are editing.
- Keep the change scoped to what the instruction asks for. Do not refactor unrelated code, rename symbols, reformat the file, or touch other files unless the instruction explicitly requires it.
- Preserve the existing code style and indentation.
- Only import packages that are already in package.json (next, react and react-dom are always available). If the instruction needs a package that is not installed, make no change and say which package is missing.
- Never delete, rename or replace src/app/layout.tsx, next.config.ts, tsconfig.json or lovable.conf, and never change the package.json scripts. If the target is one of these, make no change and say why.
- Server rendering: do not access window, document or localStorage at module scope or in a server component; use a client component ('use client') with effects or event handlers.
- Server-only code uses Server Actions ('use server') or Route Handlers under src/app/api; secrets must never use the NEXT_PUBLIC_ prefix or be hardcoded, and never log tokens, cookies or headers.
- If the instruction is already satisfied or cannot be applied, make no change and say why in one sentence.
- Never ask questions. When done, reply with a single short sentence describing what changed, in the same language as the instruction.`,
  model: getModel(DEFAULT_AGENT_MODEL),
});
