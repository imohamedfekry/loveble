import { inngest } from '../client';
import { generateText as aiGenerateText, stepCountIs } from 'ai';
import { crawlTool } from 'src/ai/tools/crawl.tool';
import { searchTool } from 'src/ai/tools/webSearch.tool';
import { getModel } from 'src/ai/providers';
import type { ModelId } from 'src/ai/providers/types';

export const generateText = inngest.createFunction(
  {
    id: 'generate-text',
    name: 'AI Agent Generate',
    retries: 3,
    triggers: [{ event: 'text/generate' }],
  },
  async ({ event, logger }) => {
    const modelId = (event.data.model as ModelId) ?? 'google:gemini-2.5-flash';
    const prompt = event.data.prompt;
    const model = getModel(modelId);

    const result = await aiGenerateText({
      model,
      prompt,
      tools: { searchTool, crawlTool },
      stopWhen: stepCountIs(13),
      experimental_onToolCallStart: async ({ toolCall }) => {
        const msg = `[AI:TOOL] USED ${toolCall.toolName}`;
        const data = {
          tool: toolCall.toolName,
          input: (toolCall as any).input,
        };
        if (logger?.info) logger.info(data, msg);
        console.log(msg, data.input);
      },
    });

    return {
      success: true,
      model: modelId,
      response: result.text,
    };
  },
);
