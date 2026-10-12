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
- Keep the change scoped to what the instruction asks for. Do not refactor unrelated code, rename symbols, reformat the file, or touch other files unless the instruction explicitly requires it.
- Preserve the existing code style and indentation.
- If the instruction is already satisfied or cannot be applied, make no change.
- Never ask questions. When done, reply with a single short sentence describing what changed.`,
  model: getModel(DEFAULT_AGENT_MODEL),
});
