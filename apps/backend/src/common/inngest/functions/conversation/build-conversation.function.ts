import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { handleChatStream } from '@mastra/ai-sdk';
import { readUIMessageStream } from 'ai';
import { RequestContext } from '@mastra/core/request-context';
import { inngest } from '../../client';
import { mastra } from 'src/mastra';
import { resolveChatAgent } from 'src/mastra/routing/team-router';
import { ensureWorkspaceRunKey } from 'src/mastra/team/ownership';
import { getNestApp } from '../../nest-context';
import { RealtimeEmitService } from 'src/Modules/realtime/core/realtime-emit.service';
import { FileRepository } from 'src/common/database/repositories/project/file.repository';
import { buildProjectStructureContext } from 'src/Modules/ai/workspace/project-context';
import { ensureProjectMaterialized } from 'src/Modules/ai/workspace/project-materialization';
import {
  registerBuildAbort,
  unregisterBuildAbort,
} from './build-abort.registry';

const log = new Logger('Inngest:conversation-build');

/** Server-side throttle for relaying stream chunks (mirrors the client relay). */
const STREAM_RELAY_INTERVAL_MS = 80;

/**
 * Runs the build agent on the first message of a brand-new project, entirely
 * server-side. This exists because the dashboard "create project from a prompt"
 * flow never calls `/ai/chat` — so without it, the project is named but never
 * built. The stream is consumed here and the final assistant message (text +
 * every UI part: reasoning, tool calls, text) is persisted via the assistant
 * message webhook, which also emits `message:new` over realtime.
 */
export const buildConversationFunction = inngest.createFunction(
  {
    id: 'conversation-build',
    name: 'Build the first message of a brand-new project',
    retries: 2,
    triggers: [{ event: 'conversation/build' }],
  },
  async ({ event, step }) => {
    const projectId = String(event.data?.projectId ?? '');
    const conversationId = String(event.data?.conversationId ?? '');
    const userId = String(event.data?.userId ?? '');
    const content = String(event.data?.content ?? '');

    if (!projectId || !conversationId || !userId || !content) {
      log.error(
        `✖ conversation/build missing data (projectId=${projectId} conversationId=${conversationId} userId=${userId})`,
      );
      throw new Error(
        'conversation/build requires projectId, conversationId, userId, content',
      );
    }

    log.log(
      `▶ conversation/build projectId=${projectId} conversationId=${conversationId} content="${content.slice(0, 120)}"`,
    );

    const abortController = new AbortController();
    registerBuildAbort(conversationId, abortController);

    const result = await step.run('run-build-agent', async () => {
      const startedAt = Date.now();

      const app = getNestApp();

      // The agent workspace is database-backed: materialize the sandbox first
      // so the TanStack Start template exists in the database before the very
      // first turn. Otherwise the agent sees an empty project and rebuilds
      // every file from scratch.
      await ensureProjectMaterialized(BigInt(projectId), 'the first build');

      // Give the first turn the current project structure as base context.
      let agentInput = content;
      try {
        const context = await buildProjectStructureContext(
          app.get(FileRepository),
          BigInt(projectId),
        );
        if (context) {
          agentInput = `${context}\n\n<user_request>\n${content}\n</user_request>`;
        }
      } catch (error) {
        log.warn(
          `project structure snapshot failed for project ${projectId}: ${String(error)}`,
        );
      }

      const message = {
        id: randomUUID(),
        role: 'user' as const,
        parts: [{ type: 'text' as const, text: agentInput }],
      };

      const requestContext = new RequestContext<{
        projectId: string;
        conversationId: string;
        userId: string;
        mode: 'build';
      }>([
        ['projectId', projectId],
        ['conversationId', conversationId],
        ['userId', userId],
        ['mode', 'build'],
      ]);
      // Pin the run-scoped workspace key so a delegated team run shares one
      // workspace, exactly like the /ai/chat path.
      ensureWorkspaceRunKey(requestContext, 'build');

      // Route by need: even the very first message of a project can reach the
      // team supervisor when the request spans several areas.
      const route = await resolveChatAgent({ mode: 'build', message: content });
      log.log(
        `▶ route agent=${route.agentId} reason=${route.reason} conversationId=${conversationId}`,
      );

      const stream = await handleChatStream({
        mastra,
        agentId: route.agentId,
        version: 'v7',
        params: {
          messages: [message] as any[],
          trigger: 'submit-message',
          abortSignal: abortController.signal,
          requestContext,
          memory: {
            thread: conversationId,
            resource: userId,
          },
        },
        defaultOptions: { maxSteps: 25 },
        sendReasoning: true,
        sendSources: true,
        onError: (error) => {
          console.error('[conversation-build] stream error:', error);
          return error instanceof Error ? error.message : 'Chat stream failed';
        },
      });

      // Consume the whole UI stream server-side. Relay it to the project in
      // realtime so the chat panel live-renders the assistant answer as it is
      // produced, exactly like the /ai/chat flow. The last state has all parts.
      const realtime = getNestApp().get(RealtimeEmitService);
      let finalMessage: { parts?: unknown[] } | undefined;
      let lastRelayAt = 0;
      try {
        for await (const uiMessage of readUIMessageStream({
          stream,
        })) {
          if (abortController.signal.aborted) break;
          finalMessage = uiMessage;
          const parts = Array.isArray(uiMessage?.parts) ? uiMessage.parts : [];
          if (!parts.length) continue;

          const now = Date.now();
          if (now - lastRelayAt < STREAM_RELAY_INTERVAL_MS) continue;
          lastRelayAt = now;
          realtime.toProject(projectId, 'conversation:stream', {
            projectId,
            conversationId,
            messageId: uiMessage.id,
            role: 'assistant',
            parts,
            status: 'streaming',
          });
        }
      } catch (error) {
        // A user-initiated abort surfaces as a stream error mid-iteration.
        // finalMessage keeps the last relayed parts, which is what we want to
        // hand off to the stop endpoint's partial persistence.
        if (!abortController.signal.aborted) {
          throw error;
        }
        console.error('[conversation-build] stream aborted:', error);
      }
      if (abortController.signal.aborted) {
        log.log(`↺ run-build-agent aborted conversationId=${conversationId}`);
      }

      const rawParts = finalMessage?.parts ?? [];
      const parts = Array.isArray(rawParts) ? rawParts : [];
      const text = parts
        .filter((part) => (part as { type?: string }).type === 'text')
        .map((part) => (part as { text?: string }).text ?? '')
        .join('');

      log.log(
        `✓ run-build-agent parts=${parts.length} textLength=${text.length} duration=${Date.now() - startedAt}ms`,
      );

      return { content: text, parts };
    });

    // If the user stopped the generation while the build was running, the
    // stop endpoint already persisted the partial assistant + system messages.
    // Persisting the full webhook result here would duplicate rows.
    if (abortController.signal.aborted) {
      unregisterBuildAbort(conversationId);
      return {
        success: true,
        conversationId,
        aborted: true,
        keptPartial: result.parts.length > 0,
      };
    }

    const response = await step.fetch(
      'http://localhost:3001/api/v1/conversations/webhook/assistant-message',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: process.env.INNGEST_WEBHOOK_SECRET!,
        },
        body: JSON.stringify({
          conversationId,
          content: result.content,
          parts: result.parts,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      log.error(
        `✖ apply-assistant-message conversationId=${conversationId} status=${response.status} error="${error}"`,
      );
      throw new Error('Failed to persist first-message build result');
    }

    const applied: unknown = await response.json();
    log.log(
      `✓ conversation/build conversationId=${conversationId} applied=${JSON.stringify(applied)}`,
    );

    unregisterBuildAbort(conversationId);

    return { success: true, conversationId, applied };
  },
);
