import { Injectable } from '@nestjs/common';
import { generateText } from 'ai';
import { getModel } from 'src/ai/providers';
import type { ModelId } from 'src/ai/providers/types';

const MODEL: ModelId = 'ollama/gemma4:31b-cloud';

@Injectable()
export class AiService {
  async generateEdit(prompt: string, context: string): Promise<string> {
    const model = getModel(MODEL);
    const { text } = await generateText({ model, prompt });
    return text;
  }
}
