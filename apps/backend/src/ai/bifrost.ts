import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModelV4 } from '@ai-sdk/provider';

const bifrostProvider = createOpenAICompatible({
  name: 'bifrost',
  apiKey: process.env.BIFROST_VIRTUAL_KEY!,
  baseURL: `${process.env.BIFROST_BASE_URL}/v1`,
});

export function getModel(modelId: string): LanguageModelV4 {
  return bifrostProvider(modelId);
}