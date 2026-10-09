import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConversationsService } from './conversations.service';
import { AuthWebhook } from 'src/common/decorator/auth-webhook.decorator';

@Controller('conversations/webhook')
@AuthWebhook()
export class ConversationsWebhookController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('generated-title')
  async generatedTitle(
    @Headers('authorization') authorization: string,
    @Body() body: { conversationId: string; title: string },
  ) {
    if (
      authorization !== this.configService.get<string>('inngest.webhookSecret')
    ) {
      throw new UnauthorizedException();
    }

    return this.conversationsService.applyGeneratedTitle(body);
  }
}
