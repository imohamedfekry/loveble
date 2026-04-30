import { Injectable } from '@nestjs/common';
import { AccessTokenService } from 'src/common/Global/security/jwt/services/access-token.service';
import { UserRepository } from 'src/common/database/repositories/user/user.repository';

@Injectable()
export class SocketAuthService {
  constructor(
    private readonly accessTokenService: AccessTokenService,
    private readonly userRepository: UserRepository,
  ) {}

  async validateToken(token: string) {
    const payload = await this.accessTokenService.verify<{ sub: string }>(
      token.trim(),
    );

    if (!payload?.sub) {
      throw new Error('Invalid token payload');
    }

    const user = await this.userRepository.findById(BigInt(payload.sub));
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }
}