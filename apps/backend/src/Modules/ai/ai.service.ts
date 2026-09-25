import { Injectable } from '@nestjs/common';
import { generateText } from 'ai';
import { getModel } from 'src/ai/providers';

const MODEL = 'openrouter/inclusionai/ling-3.0-flash-fin:free';

@Injectable()
export class AiService {
  async generateEdit(prompt: string, context: string): Promise<string> {
    const model = getModel(MODEL);
    const { text } = await generateText({ model, prompt });
    return text;
  }
}
