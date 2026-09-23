import { inngest } from '../client';
import {
  createGeneralAgent,
  DEFAULT_AGENT_MODEL,
} from '../agents/general.agent';
import type { ModelId } from 'src/ai/providers/types';

export const generateTextFunction = inngest.createFunction(
  {
    id: 'generate-text',
    name: 'AI generate text',
    retries: 3,
    triggers: [{ event: 'text/generate' }],
  },
  async ({ event }) => {
    const prompt = String(event.data?.prompt ?? '');
    const modelId = (event.data?.model ?? DEFAULT_AGENT_MODEL) as ModelId;

    if (!prompt) {
      throw new Error('generate-text job requires a prompt');
    }

    const network = createGeneralAgent(modelId);
    const run = await network.run(prompt);

    return {
      success: true,
      model: modelId,
      result: extractText(run),
    };
  },
);

function extractText(run: unknown): string {
  if (typeof run === 'string') return run;
  const anyRun = run as {
    output?: unknown;
    text?: unknown;
  };
  const output = anyRun?.output ?? anyRun?.text ?? run;
  if (typeof output === 'string') return output;
  if (Array.isArray(output)) {
    return output
      .map((part: unknown) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object') {
          const p = part as { text?: unknown; content?: unknown };
          const text = p.text ?? p.content;
          return typeof text === 'string' ? text : '';
        }
        return '';
      })
      .join('');
  }
  return JSON.stringify(output ?? run);
}
