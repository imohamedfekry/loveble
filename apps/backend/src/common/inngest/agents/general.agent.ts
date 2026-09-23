import { createAgent, createNetwork } from '@inngest/agent-kit';
import { getModel } from 'src/ai/providers';
import type { ModelId } from 'src/ai/providers/types';
import { crawlAgentTool, searchAgentTool } from './tools';

export const DEFAULT_AGENT_MODEL: ModelId = 'google:gemini-2.5-flash';

export function createGeneralAgent(modelId: ModelId = DEFAULT_AGENT_MODEL) {
  // Agent Kit's model type is a branded wrapper; AI SDK LanguageModelV3 is
  // compatible at runtime via agent-kit's internal adapter.
  const model = getModel(modelId) as unknown as Parameters<
    typeof createAgent
  >[0]['model'];

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
