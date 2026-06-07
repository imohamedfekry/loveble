export type ProviderName =
  | "google"
  | "openai"
  | "anthropic"
  | "kimi";

export type ModelId =
  `${ProviderName}:${string}`;