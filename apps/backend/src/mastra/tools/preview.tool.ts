import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { getNestApp } from 'src/common/inngest/nest-context';
import { PreviewService } from 'src/Modules/preview/preview.service';
import type { PreviewState } from 'src/Modules/preview/preview.service';

const MAX_CONTENT_CHARS = 20_000;

/**
 * Lets an agent read what the running preview currently serves.
 *
 * It talks to the sandbox dev-server host directly, so the agent can inspect
 * the rendered output without any user credentials or proxy round-trip.
 */
export const previewReadTool = createTool({
  id: 'preview-read',
  description: `Read the current preview of the project (the running front-end app) as it would be served to the user.

This also rebuilds the preview from the project files and (re)starts it when they changed, so call it after edits. Paths are relative to the app root (use "/" for the home page, e.g. "/about"). Returns the HTTP status, the response body (HTML) truncated to a safe size, and — when the app does not answer successfully — the preview status, error, and the dev server log tail.

If it fails, inspect the returned "logs" or use the terminal tool to debug.`,
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
    previewStatus: z.string().optional(),
    error: z.string().optional(),
    logs: z.string().optional(),
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

    let state: PreviewState | undefined;
    try {
      state = await preview.ensure(BigInt(projectId), { force: true });
    } catch {
      state = preview.peek(BigInt(projectId));
    }

    if (!state?.host || state.status !== 'ready') {
      const logs = state
        ? await preview
            .readLogs(BigInt(projectId), 60)
            .then((result) => result.logs)
            .catch(() => '')
        : '';
      return {
        ok: false,
        path,
        content: '',
        truncated: false,
        previewStatus: state?.status,
        error: state?.error ?? 'Preview is not ready yet.',
        logs: logs || undefined,
      };
    }

    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `https://${state.host}${cleanPath}`;

    try {
      const res = await fetch(url, {
        headers: state.trafficToken
          ? { 'e2b-traffic-access-token': state.trafficToken }
          : undefined,
      });
      const text = await res.text();
      const logs = res.ok
        ? ''
        : await preview
            .readLogs(BigInt(projectId), 60)
            .then((result) => result.logs)
            .catch(() => '');
      return {
        ok: res.ok,
        status: res.status,
        path,
        content: text.slice(0, MAX_CONTENT_CHARS),
        truncated: text.length > MAX_CONTENT_CHARS,
        previewStatus: state.status,
        ...(logs ? { logs } : {}),
      };
    } catch (err) {
      const logs = await preview
        .readLogs(BigInt(projectId), 60)
        .then((result) => result.logs)
        .catch(() => '');
      return {
        ok: false,
        path,
        content: '',
        truncated: false,
        previewStatus: state.status,
        error: err instanceof Error ? err.message : String(err),
        logs: logs || undefined,
      };
    }
  },
});

/** Tail of the preview dev server log (stdout + stderr). */
export const previewLogsTool = createTool({
  id: 'preview-logs',
  description: `Read the tail of the preview dev server log (stdout and stderr) to diagnose why the app is not starting or returning errors.`,
  inputSchema: z.object({
    lines: z
      .number()
      .int()
      .positive()
      .optional()
      .default(200)
      .describe('How many trailing log lines to return (default 200).'),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    logs: z.string(),
    previewStatus: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ lines }, context) => {
    const rawId = context?.requestContext?.get('projectId');
    if (typeof rawId !== 'string' && typeof rawId !== 'number') {
      return {
        ok: false,
        logs: '',
        error: 'No project in context — cannot read the preview log.',
      };
    }

    try {
      const app = getNestApp();
      const preview = app.get<PreviewService>(PreviewService);
      const result = await preview.readLogs(BigInt(String(rawId)), lines);
      return {
        ok: true,
        logs: result.logs || '(no preview log yet)',
        previewStatus: result.status,
        ...(result.error ? { error: result.error } : {}),
      };
    } catch (err) {
      return {
        ok: false,
        logs: '',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});
