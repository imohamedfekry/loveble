import { inngest } from '../../client';
import {
  createGeneralAgent,
  DEFAULT_AGENT_MODEL,
} from '../../agents/general.agent';

export const generateTextFunction = inngest.createFunction(
  {
    id: 'generate-text',
    name: 'AI generate text',
    retries: 3,
    triggers: [{ event: 'text/generate' }],
  },
  async ({ event }) => {
    const prompt = String(event.data?.prompt ?? '');
    const modelId = event.data?.model ?? DEFAULT_AGENT_MODEL;

    if (!prompt) {
      throw new Error('generate-text job requires a prompt');
    }

    const agent = createGeneralAgent(modelId);
    const result = await agent.generate(prompt);

    return {
      success: true,
      model: modelId,
      result: result.text,
    };
  },
);
