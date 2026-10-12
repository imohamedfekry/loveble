import { MessageList } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { PostgresStore } from '@mastra/pg';

// Observational Memory is wired up but disabled. Flip this flag (and provide an
// observer model under `observationalMemory`) to enable long-conversation
// compression later. It stays thread-scoped so conversations never share memory.
const ENABLE_OBSERVATIONAL_MEMORY = false;

const WORKING_MEMORY_TEMPLATE = `# Conversation Memory

## Current Task
What the user is currently working on in this conversation.

## Key Facts
Important facts learned during this conversation.

## Decisions
Choices that were made in this conversation.

## Open Questions
Unresolved items to follow up on.`;

export const generalAgentStorage = new PostgresStore({
  id: 'loveble-memory',
  connectionString: process.env.DATABASE_URL!,
  // Keep every mastra_* table out of the application's `public` schema. The
  // store creates the schema on init and fully qualifies its tables, so the
  // app's own tables are never touched.
  schemaName: process.env.MASTRA_SCHEMA ?? 'mastra',
});

export const generalAgentMemory = new Memory({
  storage: generalAgentStorage,
  options: {
    // We generate conversation titles ourselves via the Inngest naming agent.
    generateTitle: false,
    // Bounded, thread-scoped context window (frees 25% when exceeded).
    messageHistory: { maxTokens: 8_000, atMaxRemoveTokens: 2_000 },
    // `scope: 'thread'` guarantees complete isolation between conversations —
    // the default ('resource') would leak memory across all of a user's threads.
    workingMemory: {
      enabled: true,
      scope: 'thread',
      template: WORKING_MEMORY_TEMPLATE,
    },
    ...(ENABLE_OBSERVATIONAL_MEMORY
      ? { observationalMemory: { scope: 'thread' as const } }
      : {}),
  },
});

type MessageListAddInput = Parameters<MessageList['add']>[0];

/**
 * Ensure a Mastra thread exists for a conversation before touching its memory.
 * The agent creates the thread on its first run, but the memory API (and the
 * stop-mirror path) can be reached before that ever happened — an empty thread
 * with a valid id is enough. Existing threads are never clobbered so the
 * agent-generated title is preserved.
 */
export async function ensureMemoryThread(params: {
  threadId: string;
  resourceId: string;
  title?: string;
}): Promise<void> {
  const thread = await generalAgentMemory.getThreadById({
    threadId: params.threadId,
  });
  if (thread) return;
  await generalAgentMemory.saveThread({
    thread: {
      id: params.threadId,
      resourceId: params.resourceId,
      title: params.title ?? '',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

/**
 * Mirror an aborted ("stopped") assistant turn into the thread's Mastra memory.
 *
 * When the user stops a generation the agent never finishes the run, so neither
 * the partial assistant text nor any tool calls it already made are persisted to
 * memory. We replay the partial UI parts through a `MessageList` (which converts
 * AI SDK UI parts — including tool calls — into `MastraDBMessage`s) and save them
 * to the same thread/resource the agent uses. The stop marker is appended as a
 * trailing text part because Mastra does not persist standalone system messages.
 */
export async function mirrorStoppedTurnToMemory(params: {
  threadId: string;
  resourceId: string;
  messageId: string;
  parts: unknown[];
  marker?: string;
  threadTitle?: string;
}): Promise<void> {
  const parts = Array.isArray(params.parts) ? [...params.parts] : [];
  if (params.marker) {
    parts.push({ type: 'text', text: `\n\n${params.marker}` });
  }
  if (parts.length === 0) return;

  // The agent normally creates the thread before generating, but we may be
  // stopping before that ever happened (or the thread was cleared). Ensure it
  // exists first — saveMessages requires a valid thread.
  await ensureMemoryThread({
    threadId: params.threadId,
    resourceId: params.resourceId,
    title: params.threadTitle,
  });

  const list = new MessageList({
    threadId: params.threadId,
    resourceId: params.resourceId,
  });
  list.add(
    {
      id: params.messageId,
      role: 'assistant',
      parts,
    } as unknown as MessageListAddInput,
    'response',
  );

  const messages = list.drainUnsavedMessages();
  if (messages.length === 0) return;

  await generalAgentMemory.saveMessages({ messages });
}
