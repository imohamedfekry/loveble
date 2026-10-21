/** Filesystem root inside the sandbox where the project is materialized. */
export const PREVIEW_PROJECT_ROOT = '/home/user/project';

/** Port the Vite dev server binds to inside the sandbox. */
export const PREVIEW_DEV_PORT = 3000;

/** Public proxy path prefix (without a trailing slash). */
export const PREVIEW_PUBLIC_PREFIX = '/api/v1/preview';

/** Build the Vite `base` (with trailing slash) for a project. */
export function previewBasePath(projectId: string | bigint): string {
  return `${PREVIEW_PUBLIC_PREFIX}/${projectId}/`;
}

/** How long a known-ready preview is trusted before re-validating (ms). */
export const PREVIEW_READY_TTL_MS = 15_000;

/** Max time to wait for the dev server to answer after starting it (ms). */
export const PREVIEW_START_TIMEOUT_MS = 60_000;

/** Timeout for `npm install` (ms). */
export const PREVIEW_INSTALL_TIMEOUT_MS = 5 * 60_000;
