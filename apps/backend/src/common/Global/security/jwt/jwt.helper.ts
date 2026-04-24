import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import type { AuthenticatedUser } from '../types/auth-request.type';
import { UserRepository } from 'src/common/database/repositories/user/user.repository';

type JwtSubjectPayload = {
  sub?: string;
} & Record<string, unknown>;

type TokenKind = 'access' | 'temp' | 'refresh';
type TokenAction = 'sign' | 'verify';

@Injectable()
export class JwtHelper {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) { }

  token(
    action: TokenAction,
    kind: TokenKind,
    input: string | JwtSubjectPayload,
  ): string | JwtSubjectPayload | null {
    const secret =
      kind === 'temp'
        ? this.configService.getOrThrow<string>('jwt.temp.secret')
        : kind === 'refresh'
          ? this.configService.getOrThrow<string>('jwt.refreshToken.secret')
          : this.configService.getOrThrow<string>('jwt.accessToken.secret');

    try {
      if (action === 'verify') {
        return this.jwtService.verify(input as string, { secret }) as JwtSubjectPayload;
      }

      const payload = input as JwtSubjectPayload;
      const expiresIn =
        kind === 'temp'
          ? '3m'
          : kind === 'refresh'
            ? this.configService.get<string>('jwt.refreshToken.expiresIn', '7d')
            : this.configService.get<string>('jwt.accessToken.expiresIn', '15m');

      return this.jwtService.sign(payload, {
        secret,
        expiresIn,
      } as JwtSignOptions);
    } catch {
      return null;
    }
  }

  async VerifyAndGetUser(token: string): Promise<AuthenticatedUser | null> {
    const decoded = this.token('verify', 'access', token) as JwtSubjectPayload | null;
    if (!decoded?.sub) {
      return null;
    }
    const userId = BigInt(decoded.sub);
    const user = await this.userRepository.findById(userId);
    return user ?? null;
  }
}
