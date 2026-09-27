import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedRequest } from 'src/common/Global/security/types/auth-request.type';
import {RESPONSE_MESSAGES} from "@loveble/utils";
import { fail, success } from 'src/common/utils/response.util';
import { RealtimeEmitService } from '../realtime/core/realtime-emit.service';
import { ConversationRepository } from 'src/common/database/repositories/conversations/conversation.repository';
import { MessageRepository } from 'src/common/database/repositories/conversations/message.repository';
import { ProjectRepository } from 'src/common/database/repositories/project/project.repository';
import type {
  CreateConversationDto,
  CreateMessageDto,
  UpdateConversationDto,
  UpdateMessageDto,
} from './dto/conversation.dto';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly realtimeEmitService: RealtimeEmitService,
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
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException(fail(RESPONSE_MESSAGES.CONVERSATION.NOT_FOUND));
    }
    await this.assertProjectOwnership(conversation.projectId, req);
    return conversation;
  }

  async create(body: CreateConversationDto, req: AuthenticatedRequest) {
    const projectId = BigInt(body.projectId);
    await this.assertProjectOwnership(projectId, req);
    const conversation = await this.conversationRepository.create({
      projectId,
      title: body.title,
    });

    this.realtimeEmitService.toProject(
      projectId,
      'conversation:created',
      conversation,
    );

    return success(RESPONSE_MESSAGES.CONVERSATION.CREATE.SUCCESS, {
      conversation,
    });
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
      throw new NotFoundException(fail(RESPONSE_MESSAGES.CONVERSATION.NOT_FOUND));
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
    return success(RESPONSE_MESSAGES.MESSAGE.FETCH_SUCCESS, { messages: messageList });
  }

  async createMessage(
    conversationId: bigint,
    body: CreateMessageDto,
    req: AuthenticatedRequest,
  ) {
    const conversation = await this.assertConversationOwnership(conversationId, req);

    const message = await this.messageRepository.create({
      conversationId,
      projectId: conversation.projectId,
      content: body.content,
      role: body.role,
      status: 'completed',
    });

    this.realtimeEmitService.toProject(
      conversation.projectId,
      'message:new',
      message,
    );

    return success(RESPONSE_MESSAGES.MESSAGE.CREATE.SUCCESS, { message });
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
}
