import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { UserRepository } from 'src/common/database/repositories/user/user.repository';
import { AccessTokenService } from '../jwt/services/access-token.service';
import type { AuthenticatedUser } from '../types/auth-request.type';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly accessTokenService: AccessTokenService,
    private readonly userRepository: UserRepository,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user: AuthenticatedUser }>();

    const token = request.cookies?.['Authorization'];

    if (!token) {
      throw new UnauthorizedException('Authentication token is missing');
    }

    try {
      // Automatic verify handles expiration throw
      const payload = await this.accessTokenService.verify<{ sub: string }>(token.trim());

      if (!payload?.sub) {
        throw new Error('Invalid token payload');
      }

      const user = await this.userRepository.findById(BigInt(payload.sub));

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      request.user = user;
      return true;
    } catch (error) {
      this.logger.error(`AuthGuard failed: ${error}`);
      const message = error instanceof Error ? error.message : 'Authentication failed';
      throw new UnauthorizedException(message);
    }
  }
}
