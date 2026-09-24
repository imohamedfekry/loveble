import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModelV3 } from '@ai-sdk/provider';
import type { ModelId } from './providers/types';

const bifrostProvider = createOpenAICompatible({
  name: 'bifrost',
  apiKey: process.env.BIFROST_VIRTUAL_KEY!,
  baseURL: `${process.env.BIFROST_BASE_URL}/v1`,
});

export function getModel(modelId: ModelId): LanguageModelV3 {
  return bifrostProvider(modelId);
}