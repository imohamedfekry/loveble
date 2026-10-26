import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { Auth, AuthUser } from 'src/common/decorator/auth-user.decorator';
import type { User } from 'src/common/database/schema';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { handleChatStream } from '@mastra/ai-sdk';
import { createUIMessageStreamResponse } from 'ai';
import { RequestContext } from '@mastra/core/request-context';
import { mastra } from 'src/mastra';
import type { ChatMode } from 'src/mastra/agents/chat-agents';
import { resolveChatAgent } from 'src/mastra/routing/team-router';
import { ensureWorkspaceRunKey } from 'src/mastra/team/ownership';
import { MessageRepository } from 'src/common/database/repositories/conversations/message.repository';
import { FileRepository } from 'src/common/database/repositories/project/file.repository';
import { buildProjectStructureContext } from './workspace/project-context';
import { ensureProjectMaterialized } from './workspace/project-materialization';
import { ChatRequestSchema } from './dto/chat.dto';
import type { ChatRequestDto } from './dto/chat.dto';

// Upper bound on how long we wait for the agent stream to be created. A slow
// model call (Bifrost/Ollama) or a hanging pre-stream step must not leave the
// HTTP request open forever — after this we fail with a 500 so the client's
// `useChat` hits `onError` instead of freezing on "Working…".
const CHAT_START_TIMEOUT_MS = 120_000;

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

@Controller('ai/chat')
@Auth()
export class ChatController {
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly fileRepository: FileRepository,
  ) {}

  @Post()
  async chat(
    @Body({ schema: ChatRequestSchema }) body: ChatRequestDto,
    @AuthUser() user: User,
    @Req() request: import('fastify').FastifyRequest,
    @Res({ passthrough: true }) reply: import('fastify').FastifyReply,
  ) {
    const startedAt = Date.now();
    const abortController = new AbortController();
    try {
      // Stop the generation when the client disconnects (e.g. the user clicked
      // "Stop" and aborted the fetch). Without this the model would keep
      // generating until the request finishes, wasting compute.
      request.raw.once('aborted', () => abortController.abort());
      reply.raw.once('close', () => {
        if (!reply.raw.writableFinished) abortController.abort();
      });
      // The agent prompt is built entirely on the server. The current message
      // is the only thing taken from the client; prior turns come from Mastra
      // memory, scoped to this conversation (thread) so threads never share.
      // On the first turn of a conversation, prepend the current project
      // structure so the agent starts from the scaffold that already exists
      // instead of recreating every file.
      let agentInput = body.message;
      const isFirstTurn = await this.messageRepository
        .countByConversation(BigInt(body.conversationId))
        .then((count) => count <= 1)
        .catch(() => true);
      if (isFirstTurn) {
        // The first turn must not run against a workspace that is still empty:
        // wait until the project template has been adopted into the database.
        await ensureProjectMaterialized(
          BigInt(body.projectId),
          'the first chat turn',
        );
        const context = await buildProjectStructureContext(
          this.fileRepository,
          BigInt(body.projectId),
        ).catch(() => null);
        if (context) {
          agentInput = `${context}\n\n<user_request>\n${body.message}\n</user_request>`;
        }
      }

      const message = {
        id: randomUUID(),
        role: 'user' as const,
        parts: [{ type: 'text' as const, text: agentInput }],
      };

      // Plan vs build decides which chat agent runs. Plan mode is intentionally
      // read-only; build mode gets the full workspace (edits + execution).
      const mode: ChatMode = body.mode ?? 'build';

      // Route before the stream opens: plan mode → planner, a request that
      // needs several specialists → team supervisor, otherwise the build agent.
      // Routing is based on need only — the first message of a project is routed
      // like any other, so a large first prompt can still reach the team. The
      // LLM tie-breaker only runs for messages the heuristic cannot place and
      // has a hard 4s budget, so routing never stalls the response.
      const route = await resolveChatAgent({ mode, message: body.message });
      const agentId = route.agentId;
      console.log(
        `[ChatController] agent=${agentId} reason=${route.reason} mode=${mode}`,
      );

      // Per-request context flows into the agents' dynamic workspace/broker
      // resolvers so each tool call targets the right project + sandbox.
      const requestContext = new RequestContext<{
        projectId: string;
        conversationId: string;
        userId: string;
        mode: ChatMode;
      }>([
        ['projectId', body.projectId],
        ['conversationId', body.conversationId],
        ['userId', String(user.id)],
        ['mode', mode],
      ]);
      // Pin the run-scoped workspace key on the request context before anything
      // fans out. Every downstream copy (sub-agent delegation, workflow
      // branches, tool calls) then inherits the same object reference, so the
      // whole request shares one Workspace — one write lock, one file snapshot.
      ensureWorkspaceRunKey(requestContext, mode);

      const stream = await withTimeout(
        handleChatStream({
          mastra,
          agentId,
          version: 'v7',
          params: {
            messages: [message] as any[],
            trigger: body.trigger,
            abortSignal: abortController.signal,
            requestContext,
            memory: {
              thread: body.conversationId,
              resource: String(user.id),
            },
          },
          defaultOptions: { maxSteps: 25 },
          sendReasoning: true,
          sendSources: true,
          onError: (error) => {
            console.error('[ChatController] stream error:', error);
            return error instanceof Error
              ? error.message
              : 'Chat stream failed';
          },
        }),
        CHAT_START_TIMEOUT_MS,
        'Chat stream',
      );
      const response = createUIMessageStreamResponse({ stream });
      response.headers.forEach((value, key) => {
        reply.header(key, value);
      });
      const nodeStream = Readable.fromWeb(
        response.body as import('node:stream/web').ReadableStream,
      );
      nodeStream.on('error', (error) => {
        console.error('[ChatController] stream error:', error);
      });
      console.log(
        `[ChatController] stream started in ${Date.now() - startedAt}ms`,
      );
      return nodeStream;
    } catch (error) {
      console.error(
        `[ChatController] failed after ${Date.now() - startedAt}ms:`,
        error,
      );
      throw error;
    }
  }
}
