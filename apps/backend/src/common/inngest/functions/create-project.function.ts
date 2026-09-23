import { inngest } from '../client';
import { streamText } from 'ai';
import { getModel } from 'src/ai/providers';
import type { ModelId } from 'src/ai/providers/types';
import { DEFAULT_AGENT_MODEL } from '../agents/general.agent';

export const createProjectFunction = inngest.createFunction(
  {
    id: 'create-project',
    name: 'Create project name from prompt',
    retries: 3,
    triggers: [{ event: 'project/create' }],
  },
  async ({ event, step }) => {
    const prompt = String(event.data?.prompt ?? '');
    const modelId = (event.data?.model ?? DEFAULT_AGENT_MODEL) as ModelId;

    if (!prompt) {
      throw new Error('create-project job requires a prompt');
    }

    return step.run('generate-name', async () => {
      const model = getModel(modelId);
      const result = streamText({
        model,
        prompt: `Understand the user's intent and generate the most suitable short name for it (max 50 chars). Return only the name, nothing else: "${prompt}"`,
      });

      let projectName = '';
      for await (const chunk of result.textStream) {
        projectName += chunk;
      }

      return {
        success: true,
        projectName: projectName.trim(),
      };
    });
  },
);
