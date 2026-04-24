import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { JwtHelper } from '../jwt/jwt.helper';
import type { AuthenticatedUser } from '../types/auth-request.type';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtHelper: JwtHelper) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.DEBUG_GUARDS === 'true') {
      console.log('[AuthGuard] canActivate');
    }

    // Cast to FastifyRequest to access cookies (set by @fastify/cookie)
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user: AuthenticatedUser }>();

    // Read access token from HttpOnly cookie
    const token = request.cookies?.['Authorization'];

    if (!token) {
      throw new UnauthorizedException('Forbidden resource');
    }

    const user = await this.jwtHelper.VerifyAndGetUser(token);
    if (!user) {
      throw new UnauthorizedException('Forbidden resource');
    }

    request.user = user;
    return true;
  }
}
