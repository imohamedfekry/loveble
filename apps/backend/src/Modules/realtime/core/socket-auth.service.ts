import { Injectable, Logger } from '@nestjs/common';
import { AccessTokenService } from 'src/common/Global/security/jwt/services/access-token.service';
import { UserRepository } from 'src/common/database/repositories/user/user.repository';

@Injectable()
export class SocketAuthService {
  private readonly logger = new Logger(SocketAuthService.name);

  constructor(
    private readonly accessTokenService: AccessTokenService,
    private readonly userRepository: UserRepository,
  ) {}

  private normalizeToken(raw: string): string {
    let token = raw.trim();
    // دعم "Bearer <token>"
    if (token.toLowerCase().startsWith('bearer ')) {
      token = token.slice(7).trim();
    }
    // إزالة اقتباسات قد تأتي من الكوكي
    if (
      (token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'"))
    ) {
      token = token.slice(1, -1).trim();
    }
    return token;
  }

  async validateToken(rawToken: string) {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new Error('Missing token');
    }

    const token = this.normalizeToken(rawToken);
    if (!token) throw new Error('Empty token after normalization');

    let payload: { sub: string } | null = null;
    try {
      payload = await this.accessTokenService.verify<{ sub: string }>(token);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.debug(`Token verify failed: ${msg}`);
      throw new Error(`Invalid token: ${msg}`);
    }

    if (!payload?.sub) {
      throw new Error('Invalid token payload: missing sub');
    }

    let userId: bigint;
    try {
      // sub قد يكون string أو number
      userId = BigInt(String(payload.sub).trim());
    } catch {
      throw new Error('Invalid token payload: sub is not a valid BigInt');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }
}
