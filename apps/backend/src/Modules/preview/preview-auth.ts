import { ProjectRepository } from 'src/common/database/repositories/project/project.repository';
import { AccessTokenService } from 'src/common/Global/security/jwt/services/access-token.service';

import {
  PREVIEW_IFRAME_TOKEN_TTL_MS,
  PREVIEW_TOKEN_COOKIE,
} from './preview.constants';
import { PreviewTokenService } from './preview-token.service';

/**
 * Authorize a caller on a preview host.
 *
 * The Loveble `Authorization` cookie (Domain=.loveble.app) is missing after a
 * top-level return from an IdP like Google — the browser treats that navigation
 * as cross-site. A host-only `__preview_auth` cookie, set on the first
 * authenticated preview load, is first-party on `<id>.loveble.app` and is sent
 * on the OAuth GET redirect (SameSite=Lax).
 */
export async function authorizePreviewCaller(options: {
  cookieHeader: string | undefined;
  parsedCookies?: Record<string, string | undefined>;
  projectId: string;
  tokens: PreviewTokenService;
  accessTokens: AccessTokenService;
  projects: ProjectRepository;
}): Promise<boolean> {
  const previewToken =
    options.parsedCookies?.[PREVIEW_TOKEN_COOKIE] ??
    readCookie(options.cookieHeader, PREVIEW_TOKEN_COOKIE);
  if (options.tokens.verify(options.projectId, previewToken)) return true;

  const session =
    options.parsedCookies?.['Authorization'] ??
    readCookie(options.cookieHeader, 'Authorization');
  if (!session) return false;

  try {
    const payload = await options.accessTokens.verify<{ sub: string }>(
      session.trim(),
    );
    if (!payload?.sub) return false;
    const project = await options.projects.findById(BigInt(options.projectId));
    return Boolean(project && project.userId === BigInt(payload.sub));
  } catch {
    return false;
  }
}

/** Host-only pin so OAuth / payment returns can keep using this preview. */
export function serializePreviewAuthCookie(token: string): string {
  const maxAge = Math.floor(PREVIEW_IFRAME_TOKEN_TTL_MS / 1000);
  return [
    `${PREVIEW_TOKEN_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ');
}

export function issuePreviewAuthCookie(
  tokens: PreviewTokenService,
  projectId: string,
): string {
  return serializePreviewAuthCookie(
    tokens.issue(projectId, PREVIEW_IFRAME_TOKEN_TTL_MS),
  );
}

export function readCookie(
  header: string | undefined,
  name: string,
): string | undefined {
  if (!header) return undefined;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() !== name) continue;

    const value = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return undefined;
}
