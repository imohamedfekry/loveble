export type ChatMode = 'plan' | 'build';

/**
 * Chat mode → Mastra agent id. Plan mode is intentionally read-only; build mode
 * gets the full project workspace (file edits + command execution).
 */
export const CHAT_AGENT_IDS: Record<ChatMode, string> = {
  plan: 'planner-agent',
  build: 'builder-agent',
};
