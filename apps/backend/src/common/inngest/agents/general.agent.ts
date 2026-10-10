import { Agent } from '@mastra/core/agent';
import { getModel } from 'src/ai/providers';
import { crawlAgentTool, searchAgentTool } from './tools';

export const DEFAULT_AGENT_MODEL = 'ollama/gemma4:31b-cloud';

export function createGeneralAgent(modelId: string = DEFAULT_AGENT_MODEL) {
  return new Agent({
    id: 'general-agent',
    name: 'general-agent',
    instructions: `You are a helpful AI agent.
Use the available tools when they improve the answer (web search for fresh facts, crawl for page content).
Do not call tools more than a few times — gather what you need, then ALWAYS respond with a final text answer. Never end on tool calls alone.
Be concise and accurate.`,
    model: getModel(modelId),
    tools: { 'web-search': searchAgentTool, 'web-crawl': crawlAgentTool },
  });
}
