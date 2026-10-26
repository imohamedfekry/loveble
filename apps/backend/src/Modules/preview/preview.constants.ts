/** Filesystem root inside the sandbox where the project is materialized. */
export const PREVIEW_PROJECT_ROOT = '/home/user/app';

/** Runtime files (server log / install marker) kept outside the project tree. */
export const PREVIEW_STATE_DIR = '/tmp/lovable-preview';

/** Where the dev server's stdout/stderr is redirected. */
export const PREVIEW_LOG_PATH = `${PREVIEW_STATE_DIR}/server.log`;

/** Marker holding the package hash of the last successful install. */
export const PREVIEW_INSTALL_MARKER = `${PREVIEW_STATE_DIR}/installed`;

/** Marker holding the project signature of the last filesystem sync. */
export const PREVIEW_SYNC_MARKER = `${PREVIEW_STATE_DIR}/synced`;

/** Script and log paths baked into the TanStack Start E2B template. */
export const PREVIEW_TEMPLATE_START = '/home/user/bin/dev-server.sh';
export const PREVIEW_TEMPLATE_HEALTH = '/home/user/bin/health-check.sh';
export const PREVIEW_TEMPLATE_PID_PATH = '/home/user/.dev-server.pid';
export const PREVIEW_TEMPLATE_LOG_PATH = '/home/user/.dev-server.log';

/** Port the Vite dev server binds to inside the sandbox. */
export const PREVIEW_DEV_PORT = 3000;

/** Legacy public proxy path prefix (without a trailing slash). */
export const PREVIEW_PUBLIC_PREFIX = '/api/v1/preview';

/** Cookie that pins a preview token to the project's preview subdomain. */
export const PREVIEW_TOKEN_COOKIE = '__preview_auth';

/** Lifetime of the token handed to the preview iframe (ms). */
export const PREVIEW_IFRAME_TOKEN_TTL_MS = 60 * 60_000;

/** Base domain that hosts per-project previews (e.g. `<id>.loveble.app`). */
export function previewBaseDomain(): string {
  return (process.env.PREVIEW_BASE_DOMAIN ?? 'loveble.app')
    .trim()
    .toLowerCase()
    .replace(/^\.+|\.+$/g, '');
}

/** Protocol used in public preview URLs. */
export function previewPublicScheme(): string {
  return process.env.PREVIEW_PUBLIC_SCHEME?.trim() || 'https';
}

/** Build the public URL (with trailing slash) for a project's preview. */
export function previewPublicUrl(projectId: string | bigint): string {
  return `${previewPublicScheme()}://${projectId}.${previewBaseDomain()}/`;
}

/** Extract the project id from a `<id>.<base domain>` preview host. */
export function previewProjectFromHost(
  host: string | undefined,
): string | null {
  if (!host) return null;

  const name = host
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
  const suffix = `.${previewBaseDomain()}`;
  if (!name.endsWith(suffix)) return null;

  const projectId = name.slice(0, -suffix.length);
  return /^\d+$/.test(projectId) ? projectId : null;
}

/** How long a known-ready preview is trusted before re-validating (ms). */
export const PREVIEW_READY_TTL_MS = 15_000;

/** Max time to wait for the dev server to answer after starting it (ms). */
export const PREVIEW_START_TIMEOUT_MS = 60_000;

/** Timeout for `npm install` (ms). */
export const PREVIEW_INSTALL_TIMEOUT_MS = 5 * 60_000;
