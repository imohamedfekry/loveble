import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
// import { UserRepository } from 'src/common/database/repositories/User/User.repository';

type TokenPayload = {
  sub: string;
  type?: 'access' | 'refresh';
} & Record<string, unknown>;

type DecodedToken = {
  sub?: string;
} & Record<string, unknown>;

@Injectable()
export class JwtHelper {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    // private readonly userRepository: UserRepository,
  ) { }

  /**
   * Signs a JWT. Uses `jwt.refreshToken.*` when `payload.type === 'refresh'`, else `jwt.accessToken.*`.
   */
  generateToken(payload: TokenPayload): string {
    const isRefresh = payload.type === 'refresh';
    const base = isRefresh ? 'jwt.refreshToken' : 'jwt.accessToken';
    const secret = this.configService.getOrThrow<string>(`${base}.secret`);
    const expiresIn = this.configService.get<string>(`${base}.expiresIn`, '7d');
    return this.jwtService.sign(payload, {
      secret,
      expiresIn,
    } as JwtSignOptions);
  }

  /**
   * Verifies a JWT with the access or refresh secret.
   */
  verifyToken(token: string, kind: 'access' | 'refresh' = 'access'): unknown {
    const base = kind === 'refresh' ? 'jwt.refreshToken' : 'jwt.accessToken';
    const secret = this.configService.getOrThrow<string>(`${base}.secret`);
    return this.jwtService.verify(token, { secret });
  }
  async VerifyAndGetUser(token: unknown): Promise<unknown | null> {
    try {
      if (typeof token !== 'string' || !token) return null;

      const decoded = this.verifyToken(token) as DecodedToken | null;

      if (!decoded?.sub) return null;

      const userId = BigInt(decoded.sub);

      // const user = await this.userRepository.findById(userId);
      // if (!user) return null;
      // if (user.jwtSecret !== decoded.jwtSecret) return null;

      // return user;
    } catch {
      return null;
    }
  }
}
