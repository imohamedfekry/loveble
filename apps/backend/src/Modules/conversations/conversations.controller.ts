import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { Auth } from 'src/common/decorator/auth-user.decorator';
import type { AuthenticatedRequest } from 'src/common/Global/security/types/auth-request.type';
import { ParseSnowflakePipe } from 'src/common/Global/security/validator/isId.validator';
import { ConversationsService } from './conversations.service';
import type {
  CreateMessageDto,
  UpdateConversationDto,
  UpdateMessageDto,
} from './dto/conversation.dto';
import {
  CreateMessageSchema,
  UpdateConversationSchema,
} from './dto/conversation.dto';

@Controller('conversations')
@Auth()
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post('project/:projectId/messages')
  createFirstMessage(
    @Param('projectId', ParseSnowflakePipe) projectId: bigint,
    @Body({ schema: CreateMessageSchema }) body: CreateMessageDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.conversationsService.createFirstMessage(projectId, body, req);
  }

  @Get('project/:projectId')
  findByProject(
    @Param('projectId', ParseSnowflakePipe) projectId: bigint,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.conversationsService.findByProject(projectId, req);
  }

  @Get(':id')
  findById(
    @Param('id', ParseSnowflakePipe) id: bigint,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.conversationsService.findById(id, req);
  }

  @Patch(':id')
  update(
    @Param('id', ParseSnowflakePipe) id: bigint,
    @Body({ schema: UpdateConversationSchema }) body: UpdateConversationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.conversationsService.update(id, body, req);
  }

  @Delete(':id')
  delete(
    @Param('id', ParseSnowflakePipe) id: bigint,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.conversationsService.delete(id, req);
  }

  @Get(':conversationId/messages')
  getMessages(
    @Param('conversationId', ParseSnowflakePipe) conversationId: bigint,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.conversationsService.getMessages(conversationId, req);
  }

  @Post(':conversationId/messages')
  createMessage(
    @Param('conversationId', ParseSnowflakePipe) conversationId: bigint,
    @Body({ schema: CreateMessageSchema }) body: CreateMessageDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.conversationsService.createMessage(conversationId, body, req);
  }

  @Post(':conversationId/messages/assistant')
  createAssistantMessage(
    @Param('conversationId', ParseSnowflakePipe) conversationId: bigint,
    @Body({ schema: CreateMessageSchema }) body: CreateMessageDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.conversationsService.createAssistantMessage(
      conversationId,
      body,
      req,
    );
  }

  @Patch('messages/:messageId')
  updateMessage(
    @Param('messageId', ParseSnowflakePipe) messageId: bigint,
    @Body() body: UpdateMessageDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.conversationsService.updateMessage(messageId, body, req);
  }

  @Delete('messages/:messageId')
  deleteMessage(
    @Param('messageId', ParseSnowflakePipe) messageId: bigint,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.conversationsService.deleteMessage(messageId, req);
  }
}
