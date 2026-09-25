export type ProviderName = 'google' | 'openai' | 'anthropic' | 'kimi' | 'ollama';

export type ModelId = `${ProviderName}/${string}`;
