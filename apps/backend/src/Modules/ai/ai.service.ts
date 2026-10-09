import { Injectable } from '@nestjs/common';
import { generateText } from 'ai';
import { getModel } from 'src/ai/providers';
import {
  createGeneralAgent,
  DEFAULT_AGENT_MODEL,
} from 'src/common/inngest/agents/general.agent';

const MODEL = 'openrouter/inclusionai/ling-3.0-flash-sante:free';

@Injectable()
export class AiService {
  async generateEdit(prompt: string, context: string): Promise<string> {
    const model = getModel(MODEL);
    const { text } = await generateText({ model, prompt });
    return text;
  }

  async generateWithAgent(
    prompt: string,
    model?: string,
  ): Promise<{ text: string; model: string }> {
    const modelId = model || DEFAULT_AGENT_MODEL;
    const agent = createGeneralAgent(modelId);
    const result = await agent.generate(prompt);
    return { text: result.text, model: modelId };
  }
}
