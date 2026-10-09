import { Body, Controller, Post, Res } from '@nestjs/common';
import { Auth } from 'src/common/decorator/auth-user.decorator';
import { Readable } from 'node:stream';
import { handleChatStream } from '@mastra/ai-sdk';
import { createUIMessageStreamResponse } from 'ai';
import { mastra } from 'src/mastra';
import { ChatRequestSchema } from './dto/chat.dto';
import type { ChatRequestDto } from './dto/chat.dto';

@Controller('ai/chat')
@Auth()
export class ChatController {
  @Post()
  async chat(
    @Body({ schema: ChatRequestSchema }) body: ChatRequestDto,
    @Res({ passthrough: true }) reply: import('fastify').FastifyReply,
  ) {
    const agentId = body.mode === 'plan' ? 'planner-agent' : 'builder-agent';
    const stream = await handleChatStream({
      mastra,
      agentId,
      version: 'v7',
      params: {
        messages: body.messages as any[],
        trigger: body.trigger,
      },
    });
    const response = createUIMessageStreamResponse({ stream });
    response.headers.forEach((value, key) => reply.header(key, value));
    return Readable.fromWeb(response.body as import('node:stream/web').ReadableStream);
  }
}