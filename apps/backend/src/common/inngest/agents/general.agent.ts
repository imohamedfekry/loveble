import { Agent } from '@mastra/core/agent';
import { getModel } from 'src/ai/providers';
import { crawlAgentTool, searchAgentTool } from './tools';

export const DEFAULT_AGENT_MODEL =
  'openrouter/apodex/apodex-1.1-mini:free';

export function createGeneralAgent(modelId: string = DEFAULT_AGENT_MODEL) {
  return new Agent({
    id: 'general-agent',
    name: 'general-agent',
    instructions: `You are a helpful AI agent.
Use the available tools when they improve the answer (web search for fresh facts, crawl for page content).
Be concise and accurate.`,
    model: getModel(modelId),
    tools: { 'web-search': searchAgentTool, 'web-crawl': crawlAgentTool },
  });
}
