import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import type { AuthenticatedRequest } from 'src/common/Global/security/types/auth-request.type';
import { RESPONSE_MESSAGES } from '@loveble/utils';
import { fail, success } from 'src/common/utils/response.util';
import { RealtimeEmitService } from '../realtime/core/realtime-emit.service';
import { InngestService } from 'src/common/inngest/inngest.service';
import {
  ensureMemoryThread,
  generalAgentMemory,
  mirrorStoppedTurnToMemory,
} from 'src/common/inngest/agents/memory';
import { ConversationRepository } from 'src/common/database/repositories/conversations/conversation.repository';
import { MessageRepository } from 'src/common/database/repositories/conversations/message.repository';
import { ProjectRepository } from 'src/common/database/repositories/project/project.repository';
import { abortActiveBuild } from 'src/common/inngest/functions/conversation/build-abort.registry';
import type {
  CreateMessageDto,
  StopMessageDto,
  UpdateConversationDto,
  UpdateMessageDto,
} from './dto/conversation.dto';
import type { UpdateMemoryDto } from './dto/memory.dto';

const STOP_MESSAGE = 'Generation stopped';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly realtimeEmitService: RealtimeEmitService,
    private readonly inngestService: InngestService,
  ) {}

  private async assertProjectOwnership(
    projectId: bigint,
    req: AuthenticatedRequest,
  ) {
    const project = await this.projectRepository.findById(projectId);
    if (!project || project.userId !== req.user.id) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.PROJECT.NOT_FOUND));
    }
    return project;
  }

  private async assertConversationOwnership(
    conversationId: bigint,
    req: AuthenticatedRequest,
  ) {
    const conversation =
      await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException(
        fail(RESPONSE_MESSAGES.CONVERSATION.NOT_FOUND),
      );
    }
    await this.assertProjectOwnership(conversation.projectId, req);
    return conversation;
  }

  async createFirstMessage(
    projectId: bigint,
    body: CreateMessageDto,
    req: AuthenticatedRequest,
  ) {
    await this.assertProjectOwnership(projectId, req);
    const { conversation, message } = await this.createWithInitialMessage(
      projectId,
      body.content,
    );
    return success(RESPONSE_MESSAGES.MESSAGE.CREATE.SUCCESS, {
      conversation,
      message,
    });
  }

  async createWithInitialMessage(projectId: bigint, content: string) {
    const conversation = await this.conversationRepository.create({
      projectId,
      title: null,
    });

    const message = await this.messageRepository.create({
      conversationId: conversation.id,
      projectId,
      content,
      role: 'user',
      status: 'completed',
    });

    this.realtimeEmitService.toProject(
      projectId,
      'conversation:created',
      conversation,
    );
    this.realtimeEmitService.toProject(projectId, 'message:new', message);

    void this.inngestService
      .nameConversation({
        conversationId: conversation.id.toString(),
        text: content,
      })
      .catch((err) => this.logger.warn(`name-conversation failed: ${err}`));

    return { conversation, message };
  }

  async findById(id: bigint, req: AuthenticatedRequest) {
    const conversation = await this.assertConversationOwnership(id, req);
    return success(RESPONSE_MESSAGES.CONVERSATION.FETCH_SUCCESS, {
      conversation,
    });
  }

  async findByProject(projectId: bigint, req: AuthenticatedRequest) {
    await this.assertProjectOwnership(projectId, req);
    const conversationList =
      await this.conversationRepository.findByProject(projectId);
    return success(RESPONSE_MESSAGES.CONVERSATION.FETCH_SUCCESS, {
      conversations: conversationList,
    });
  }

  async update(
    id: bigint,
    body: UpdateConversationDto,
    req: AuthenticatedRequest,
  ) {
    await this.assertConversationOwnership(id, req);
    const conversation = await this.conversationRepository.update(id, body);
    if (!conversation) {
      throw new NotFoundException(
        fail(RESPONSE_MESSAGES.CONVERSATION.NOT_FOUND),
      );
    }

    this.realtimeEmitService.toProject(
      conversation.projectId,
      'conversation:updated',
      conversation,
    );

    return success(RESPONSE_MESSAGES.CONVERSATION.UPDATE_SUCCESS, {
      conversation,
    });
  }

  async delete(id: bigint, req: AuthenticatedRequest) {
    const conversation = await this.assertConversationOwnership(id, req);
    await this.conversationRepository.delete(id);

    this.realtimeEmitService.toProject(
      conversation.projectId,
      'conversation:deleted',
      { conversationId: id },
    );

    return success(RESPONSE_MESSAGES.CONVERSATION.DELETE_SUCCESS);
  }

  async getMessages(conversationId: bigint, req: AuthenticatedRequest) {
    await this.assertConversationOwnership(conversationId, req);
    const messageList =
      await this.messageRepository.findByConversation(conversationId);
    return success(RESPONSE_MESSAGES.MESSAGE.FETCH_SUCCESS, {
      messages: messageList,
    });
  }

  async createMessage(
    conversationId: bigint,
    body: CreateMessageDto,
    req: AuthenticatedRequest,
  ) {
    const conversation = await this.assertConversationOwnership(
      conversationId,
      req,
    );

    const message = await this.messageRepository.create({
      conversationId,
      projectId: conversation.projectId,
      content: body.content,
      role: 'user',
      status: 'completed',
    });

    this.realtimeEmitService.toProject(
      conversation.projectId,
      'message:new',
      message,
    );

    if (conversation.title === null) {
      const count =
        await this.messageRepository.countByConversation(conversationId);
      if (count === 1) {
        void this.inngestService
          .nameConversation({
            conversationId: conversationId.toString(),
            text: body.content,
          })
          .catch((err) => this.logger.warn(`name-conversation failed: ${err}`));
      }
    }

    return success(RESPONSE_MESSAGES.MESSAGE.CREATE.SUCCESS, { message });
  }

  async createAssistantMessage(
    conversationId: bigint,
    body: CreateMessageDto,
    req: AuthenticatedRequest,
  ) {
    const conversation = await this.assertConversationOwnership(
      conversationId,
      req,
    );

    const message = await this.messageRepository.create({
      conversationId,
      projectId: conversation.projectId,
      content: body.content,
      parts: body.parts ?? null,
      role: 'assistant',
      status: 'completed',
    });

    this.realtimeEmitService.toProject(
      conversation.projectId,
      'message:new',
      message,
    );

    return success(RESPONSE_MESSAGES.MESSAGE.CREATE.SUCCESS, { message });
  }

  async stopGeneration(
    conversationId: bigint,
    body: StopMessageDto,
    req: AuthenticatedRequest,
  ) {
    const conversation = await this.assertConversationOwnership(
      conversationId,
      req,
    );

    // Abort any in-flight server-side build (dashboard "create project from a
    // prompt" runs the build agent in Inngest with no /ai/chat request to
    // cancel, so the UI's only hook to stop it is stopGeneration).
    if (abortActiveBuild(conversationId.toString())) {
      this.logger.log(
        `aborted in-flight build for conversation ${conversationId}`,
      );
    }

    // Keep whatever the model produced before the stop. This includes turns
    // that only ran tools (e.g. a web search) with no text yet — those still
    // have `parts`, so they must be persisted too, not just text content.
    const content = body.content?.trim() ?? '';
    const parts = body.parts ?? [];
    const hasPartial = content.length > 0 || parts.length > 0;

    const partial = hasPartial
      ? await this.messageRepository.create({
          conversationId,
          projectId: conversation.projectId,
          content,
          parts: parts.length > 0 ? parts : null,
          role: 'assistant',
          status: 'completed',
        })
      : null;

    if (partial) {
      this.realtimeEmitService.toProject(
        conversation.projectId,
        'message:new',
        partial,
      );

      // Mirror the stopped turn (partial text + any tool calls) into the
      // thread's Mastra memory so the next turn sees what was produced.
      try {
        await mirrorStoppedTurnToMemory({
          threadId: conversationId.toString(),
          resourceId: String(req.user.id),
          messageId: partial.id.toString(),
          parts,
          marker: STOP_MESSAGE,
          threadTitle: conversation.title ?? undefined,
        });
      } catch (error) {
        this.logger.warn(
          `failed to mirror stopped turn to memory: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const system = await this.messageRepository.create({
      conversationId,
      projectId: conversation.projectId,
      content: STOP_MESSAGE,
      role: 'system',
      status: 'completed',
    });

    this.realtimeEmitService.toProject(
      conversation.projectId,
      'message:new',
      system,
    );

    return success(RESPONSE_MESSAGES.MESSAGE.CREATE.SUCCESS, {
      messages: partial ? [partial, system] : [system],
    });
  }

  async applyGeneratedTitle(body: { conversationId: string; title: string }) {
    const conversationId = BigInt(body.conversationId);
    const conversation =
      await this.conversationRepository.findById(conversationId);
    if (!conversation) return null;
    const updated = await this.conversationRepository.update(conversationId, {
      title: body.title,
    });
    if (!updated) return null;
    this.realtimeEmitService.toProject(
      updated.projectId,
      'conversation:updated',
      updated,
    );
    return updated;
  }

  /**
   * Persist a server-generated (Inngest build) assistant message. This is the
   * webhook counterpart of `createAssistantMessage`; the Inngest build runs
   * with no `req`, so ownership was already enforced when the conversation's
   * first user message was created.
   */
  async persistAssistantMessageFromWebhook(body: {
    conversationId: string;
    content?: string;
    parts?: unknown[];
  }) {
    const conversationId = BigInt(body.conversationId);
    const conversation =
      await this.conversationRepository.findById(conversationId);
    if (!conversation) return null;

    const content = (body.content ?? '').trim();
    const parts = Array.isArray(body.parts) ? body.parts : undefined;
    if (!content && !parts) return null;

    const message = await this.messageRepository.create({
      conversationId,
      projectId: conversation.projectId,
      content,
      parts: parts && parts.length > 0 ? parts : undefined,
      role: 'assistant',
      status: 'completed',
    });

    this.realtimeEmitService.toProject(
      conversation.projectId,
      'message:new',
      message,
    );

    return message;
  }

  async updateMessage(
    messageId: bigint,
    body: UpdateMessageDto,
    req: AuthenticatedRequest,
  ) {
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.MESSAGE.NOT_FOUND));
    }
    await this.assertConversationOwnership(message.conversationId, req);

    const updated = await this.messageRepository.update(messageId, body);
    if (!updated) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.MESSAGE.NOT_FOUND));
    }

    this.realtimeEmitService.toProject(
      updated.projectId,
      'message:updated',
      updated,
    );

    return success(RESPONSE_MESSAGES.MESSAGE.UPDATE_SUCCESS, {
      message: updated,
    });
  }

  async deleteMessage(messageId: bigint, req: AuthenticatedRequest) {
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.MESSAGE.NOT_FOUND));
    }
    await this.assertConversationOwnership(message.conversationId, req);

    await this.messageRepository.delete(messageId);
    return success(RESPONSE_MESSAGES.MESSAGE.DELETE_SUCCESS);
  }

  /**
   * The agent's thread-scoped "working memory" for this conversation: a
   * free-form markdown scratchpad it maintains itself (Current Task / Key
   * Facts / Decisions / Open Questions). Exposed so the user can read it, edit
   * it, or wipe it. Memory is keyed by (thread = conversation, resource = user),
   * so conversations never share it.
   */
  async getMemory(conversationId: bigint, req: AuthenticatedRequest) {
    await this.assertConversationOwnership(conversationId, req);
    const workingMemory = await generalAgentMemory.getWorkingMemory({
      threadId: conversationId.toString(),
      resourceId: String(req.user.id),
    });
    return success(RESPONSE_MESSAGES.MEMORY.FETCH_SUCCESS, {
      workingMemory: workingMemory ?? '',
    });
  }

  async updateMemory(
    conversationId: bigint,
    body: UpdateMemoryDto,
    req: AuthenticatedRequest,
  ) {
    const conversation = await this.assertConversationOwnership(
      conversationId,
      req,
    );
    await ensureMemoryThread({
      threadId: conversationId.toString(),
      resourceId: String(req.user.id),
      title: conversation.title ?? undefined,
    });
    await generalAgentMemory.updateWorkingMemory({
      threadId: conversationId.toString(),
      resourceId: String(req.user.id),
      workingMemory: body.workingMemory,
    });

    this.realtimeEmitService.toProject(
      conversation.projectId,
      'memory:updated',
      {
        conversationId: conversationId.toString(),
        workingMemory: body.workingMemory,
      },
    );

    return success(RESPONSE_MESSAGES.MEMORY.UPDATE_SUCCESS, {
      workingMemory: body.workingMemory,
    });
  }

  async clearMemory(conversationId: bigint, req: AuthenticatedRequest) {
    const conversation = await this.assertConversationOwnership(
      conversationId,
      req,
    );
    await ensureMemoryThread({
      threadId: conversationId.toString(),
      resourceId: String(req.user.id),
      title: conversation.title ?? undefined,
    });
    await generalAgentMemory.updateWorkingMemory({
      threadId: conversationId.toString(),
      resourceId: String(req.user.id),
      workingMemory: '',
    });

    this.realtimeEmitService.toProject(
      conversation.projectId,
      'memory:updated',
      {
        conversationId: conversationId.toString(),
        workingMemory: '',
      },
    );

    return success(RESPONSE_MESSAGES.MEMORY.CLEAR_SUCCESS);
  }
}
