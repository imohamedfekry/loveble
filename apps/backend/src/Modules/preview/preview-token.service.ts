import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

/** Default lifetime of an internal preview token (5 minutes). */
const DEFAULT_TTL_MS = 5 * 60_000;

/**
 * Issues short-lived HMAC tokens that grant an internal (server-side) caller
 * access to a project's preview proxy without a user cookie.
 *
 * Token format: `<expEpochSeconds>.<hexHmac>`
 * The signature covers `preview:<projectId>:<exp>`, so a token is bound to a
 * single project and expires on its own.
 */
@Injectable()
export class PreviewTokenService {
  constructor(private readonly configService: ConfigService) {}

  private secret(): string {
    const secret =
      this.configService.get<string>('jwt.accessToken.secret') ||
      process.env.JWT_ACCESS_TOKEN_SECRET ||
      process.env.COOKIE_SECRET;

    if (!secret) {
      throw new Error(
        'PreviewTokenService: no secret available (jwt.accessToken.secret)',
      );
    }
    return secret;
  }

  private sign(projectId: string, exp: number): string {
    return createHmac('sha256', this.secret())
      .update(`preview:${projectId}:${exp}`)
      .digest('hex');
  }

  /** Create a signed token for a project. */
  issue(projectId: string, ttlMs: number = DEFAULT_TTL_MS): string {
    const exp = Math.floor((Date.now() + ttlMs) / 1000);
    return `${exp}.${this.sign(projectId, exp)}`;
  }

  /** Constant-time verification of a token against a project id. */
  verify(projectId: string, token: string | undefined): boolean {
    if (!token) return false;

    const dot = token.indexOf('.');
    if (dot <= 0) return false;

    const exp = Number(token.slice(0, dot));
    const provided = token.slice(dot + 1);
    if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;

    const expected = this.sign(projectId, exp);
    if (expected.length !== provided.length) return false;

    try {
      return timingSafeEqual(
        Buffer.from(expected, 'utf8'),
        Buffer.from(provided, 'utf8'),
      );
    } catch {
      return false;
    }
  }
}
