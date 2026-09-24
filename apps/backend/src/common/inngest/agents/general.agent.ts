import {
  createAgent,
  createNetwork,
  openai,
} from '@inngest/agent-kit';
import type { ModelId } from 'src/ai/providers/types';
import { crawlAgentTool, searchAgentTool } from './tools';

export const DEFAULT_AGENT_MODEL = 'google/gemini-2.5-flash';

type AgentKitModel = Parameters<typeof createAgent>[0]['model'];

function getAgentKitModel(modelId: ModelId): AgentKitModel {
  const [provider, model] = modelId.split(':') as [string, string];
  return openai({
    model: `${provider}/${model}`,
    apiKey: process.env.BIFROST_VIRTUAL_KEY ?? '',
    baseUrl: process.env.BIFROST_BASE_URL,
  });
}

export function createGeneralAgent(modelId: ModelId = DEFAULT_AGENT_MODEL) {
  const model = getAgentKitModel(modelId);

  const agent = createAgent({
    name: 'general-agent',
    description:
      'General-purpose agent that can search the web and crawl pages to answer user prompts.',
    system: `You are a helpful AI agent.
Use the available tools when they improve the answer (web search for fresh facts, crawl for page content).
Be concise and accurate.`,
    model,
    tools: [searchAgentTool, crawlAgentTool],
  });

  return createNetwork({
    name: 'general-agent-network',
    agents: [agent],
    defaultModel: model,
    router: () => agent,
  });
}