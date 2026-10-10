import { Body, Controller, Post, Res } from '@nestjs/common';
import { Auth } from 'src/common/decorator/auth-user.decorator';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { handleChatStream } from '@mastra/ai-sdk';
import { createUIMessageStreamResponse } from 'ai';
import { mastra } from 'src/mastra';
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
        reject(error);
      },
    );
  });
}

@Controller('ai/chat')
@Auth()
export class ChatController {
  @Post()
  async chat(
    @Body({ schema: ChatRequestSchema }) body: ChatRequestDto,
    @Res({ passthrough: true }) reply: import('fastify').FastifyReply,
  ) {
    const startedAt = Date.now();
    try {
      // The agent prompt is built entirely on the server from the single message
      // being submitted. Any conversation history is NOT read from the client —
      // it will be provided by server-side memory (threads) in a later step.
      const message = {
        id: randomUUID(),
        role: 'user' as const,
        parts: [{ type: 'text' as const, text: body.message }],
      };
      const stream = await withTimeout(
        handleChatStream({
          mastra,
          agentId: 'general-agent',
          version: 'v7',
          params: {
            messages: [message] as any[],
            trigger: body.trigger,
          },
          defaultOptions: { maxSteps: 8 },
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
      response.headers.forEach((value, key) => reply.header(key, value));
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
