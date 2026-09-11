import { inngest } from '../client';
import { streamText } from 'ai';
import { getModel } from 'src/ai/providers';
import type { ModelId } from 'src/ai/providers/types';

export const createProject = inngest.createFunction(
  {
    id: 'create-project',
    name: 'Create Project From Prompt',
    retries: 3,
    triggers: [{ event: 'project/create' }],
  },
  async ({ event }) => {
    const modelId = (event.data.model as ModelId) ?? 'google:gemini-2.5-flash';
    const prompt = event.data.prompt;
    const model = getModel(modelId);

    const result = await streamText({
      model,
      prompt: `Understand the user's intent and generate the most suitable short name for it (max 50 chars). Return only the name, nothing else: "${prompt}"`,
    });

    let projectName = '';
    for await (const chunk of result.textStream) {
      console.log('Chunk received:', chunk);
      projectName += chunk;
    }

    return {
      success: true,
      projectName: projectName.trim(),
    };
  },
);
