import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModelV4 } from '@ai-sdk/provider';
import { getBifrostConfig } from 'src/common/Global/config/bifrost.config';

let bifrostProvider: ReturnType<typeof createOpenAICompatible> | undefined;

function getBifrostProvider() {
  if (!bifrostProvider) {
    const { baseUrl, virtualKey } = getBifrostConfig();
    console.log('[Bifrost auth check]', {
      exists: Boolean(virtualKey),
      length: virtualKey?.length ?? 0,
      hasWhitespace: virtualKey !== virtualKey?.trim(),
      key: virtualKey,
    });
    bifrostProvider = createOpenAICompatible({
      name: 'bifrost',
      apiKey: virtualKey,
      baseURL: `${baseUrl}/v1`,
      headers: {
        'x-bf-vk': virtualKey,
      },
    });
  }

  return bifrostProvider;
}

export function getModel(modelId: string): LanguageModelV4 {
  return getBifrostProvider()(modelId);
}
