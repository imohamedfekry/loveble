import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { getNestApp } from 'src/common/inngest/nest-context';
import { PREVIEW_PROJECT_ROOT } from 'src/Modules/preview/preview.constants';
import { PreviewService } from 'src/Modules/preview/preview.service';
import { E2bService } from 'src/Modules/sandbox/e2b.service';

const MAX_OUTPUT_CHARS = 20_000;
const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_TIMEOUT_MS = 600_000;

/** Keep the tail — build errors and stack traces usually end the output. */
function tail(text: string): string {
  return text.length > MAX_OUTPUT_CHARS
    ? text.slice(text.length - MAX_OUTPUT_CHARS)
    : text;
}

/**
 * Terminal access for the builder agent.
 *
 * The project files live in the database (that's the source of truth). Before a
 * command runs we sync the sandbox from the database, so builds/tests see the
 * same files the preview would. The command output is returned so the agent can
 * actually observe failures instead of guessing.
 */
export const terminalTool = createTool({
  id: 'terminal',
  description: `Run a shell command inside the project's Linux sandbox and get stdout, stderr, and the exit code.

The project is materialized at ${PREVIEW_PROJECT_ROOT} (the default working directory). Use this to install dependencies, run builds/type-checks/tests, inspect the filesystem, and debug failures.

Important: the sandbox is rebuilt from the project files before each command. Files you create here with shell commands are NOT saved to the project — create/edit source files with the workspace file tools instead.`,
  inputSchema: z.object({
    command: z.string().min(1).describe('Shell command to run.'),
    cwd: z
      .string()
      .optional()
      .describe(
        `Working directory. Relative paths resolve under ${PREVIEW_PROJECT_ROOT}. Defaults to the project root.`,
      ),
    timeoutMs: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        'Command timeout in milliseconds (default 120000, max 600000).',
      ),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    exitCode: z.number().optional(),
    stdout: z.string(),
    stderr: z.string(),
    cwd: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ command, cwd, timeoutMs }, context) => {
    const rawId = context?.requestContext?.get('projectId');
    const resolvedCwd = resolveCwd(cwd);

    if (typeof rawId !== 'string' && typeof rawId !== 'number') {
      return {
        ok: false,
        stdout: '',
        stderr: '',
        cwd: resolvedCwd,
        error: 'No project in context — cannot run commands.',
      };
    }
    const projectId = BigInt(String(rawId));

    try {
      const app = getNestApp();
      const preview = app.get<PreviewService>(PreviewService);
      const e2b = app.get<E2bService>(E2bService);

      const { sandboxId } = await preview.prepareSandbox(projectId);
      const timeout = Math.min(
        Math.max(timeoutMs ?? DEFAULT_TIMEOUT_MS, 1_000),
        MAX_TIMEOUT_MS,
      );
      const result = await e2b.runCommand(sandboxId, command, {
        cwd: resolvedCwd,
        timeoutMs: timeout,
      });

      return {
        ok: result.exitCode === 0,
        exitCode: result.exitCode,
        stdout: tail(result.stdout),
        stderr: tail(result.stderr),
        cwd: resolvedCwd,
      };
    } catch (err) {
      return {
        ok: false,
        stdout: '',
        stderr: '',
        cwd: resolvedCwd,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});

function resolveCwd(cwd: string | undefined): string {
  if (!cwd) return PREVIEW_PROJECT_ROOT;
  if (cwd.startsWith('/')) return cwd;
  return `${PREVIEW_PROJECT_ROOT}/${cwd.replace(/^\.?\//, '')}`;
}
