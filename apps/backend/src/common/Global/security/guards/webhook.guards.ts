import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthWebhookGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest>();

    const token = request.headers.authorization;

    const webhookSecret =
      this.configService.get<string>('inngest.webhookSecret');

    if (!token || !webhookSecret || token !== webhookSecret) {
      throw new UnauthorizedException('Invalid webhook token');
    }

    return true;
  }
}