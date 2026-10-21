import { createTool } from '@mastra/core/tools';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

import { getNestApp } from 'src/common/inngest/nest-context';
import { PreviewService } from 'src/Modules/preview/preview.service';
import type { PreviewState } from 'src/Modules/preview/preview.service';
import { PreviewTokenService } from 'src/Modules/preview/preview-token.service';

const MAX_CONTENT_CHARS = 20_000;

/**
 * Lets an agent read what the running preview currently serves.
 *
 * The preview is exposed on our own proxy and normally requires the owner's
 * session cookie. This tool mints a short-lived internal token and calls the
 * proxy on the server's loopback address, so the agent can inspect the rendered
 * output without any user credentials.
 */
export const previewReadTool = createTool({
  id: 'preview-read',
  description: `Read the current preview of the project (the running front-end app) as it would be served to the user.

Use it after making changes to verify the app boots and to inspect the rendered HTML. Paths are relative to the app root (use "/" for the home page, e.g. "/about"). Returns the response body (HTML) truncated to a safe size.`,
  inputSchema: z.object({
    path: z
      .string()
      .optional()
      .default('/')
      .describe('Path within the app to read, e.g. "/" or "/pricing".'),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    status: z.number().optional(),
    path: z.string(),
    content: z.string(),
    truncated: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ path }, context) => {
    const rawId = context?.requestContext?.get('projectId');
    if (typeof rawId !== 'string' && typeof rawId !== 'number') {
      return {
        ok: false,
        path,
        content: '',
        truncated: false,
        error: 'No project in context — cannot read the preview.',
      };
    }
    const projectId = String(rawId);

    const app = getNestApp();
    const preview = app.get<PreviewService>(PreviewService);
    const tokens = app.get<PreviewTokenService>(PreviewTokenService);
    const config = app.get<ConfigService>(ConfigService);

    let state: PreviewState | undefined;
    try {
      state = await preview.ensure(BigInt(projectId));
    } catch {
      state = preview.peek(BigInt(projectId));
    }

    if (!state?.host || !state.url) {
      return {
        ok: false,
        path,
        content: '',
        truncated: false,
        error: state?.error ?? 'Preview is not ready yet.',
      };
    }

    const port = config.get<number>('app.port') ?? 3001;
    const cleanPath = path.replace(/^\/+/, '');
    const url = `http://127.0.0.1:${port}${state.url}${cleanPath}`;

    try {
      const res = await fetch(url, {
        headers: { 'x-preview-token': tokens.issue(projectId) },
      });
      const text = await res.text();
      return {
        ok: res.ok,
        status: res.status,
        path,
        content: text.slice(0, MAX_CONTENT_CHARS),
        truncated: text.length > MAX_CONTENT_CHARS,
      };
    } catch (err) {
      return {
        ok: false,
        path,
        content: '',
        truncated: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});
