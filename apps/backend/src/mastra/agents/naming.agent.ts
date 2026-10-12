import { Agent } from '@mastra/core/agent';
import { DEFAULT_AGENT_MODEL, getModel } from 'src/ai/providers';

export function createNamingAgent(modelId: string = DEFAULT_AGENT_MODEL) {
  return new Agent({
    id: 'naming-agent',
    name: 'naming-agent',
    instructions: `You write short, clean titles for projects and conversations based on user intent.

Requirements:
- A project title is a concise DESCRIPTION of what the project does — never a brand, product, or invented name. Maximum 80 characters.
- A conversation title is a short summary of the first user message. Maximum 255 characters.
- The title MUST be written in the EXACT same language as the user's request.
- Return only the title — no explanation, no markdown, no quotes
- Do not return an empty response`,
    model: getModel(modelId),
  });
}

export const namingAgent = createNamingAgent();
