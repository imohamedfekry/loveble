import {
  applyDecorators,
  UseGuards,
} from '@nestjs/common';
import { AuthWebhookGuard } from '../Global/security/guards/webhook.guards';

export function AuthWebhook() {
  return applyDecorators(UseGuards(AuthWebhookGuard));
}