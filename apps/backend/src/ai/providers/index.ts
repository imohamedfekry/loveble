import { modelRegistry }
from "./registry";

import type {
  ModelId,
  ProviderName,
} from "./types";

type Registry =
  typeof modelRegistry;

type ProviderFactory =
  Registry[keyof Registry];

type ModelInstance =
  ReturnType<ProviderFactory>;

export function getModel(
  modelId: ModelId,
): ModelInstance {

  const [provider, model] =
    modelId.split(":") as [
      ProviderName,
      string,
    ];

  const providerFactory =
    modelRegistry[provider];

  if (!providerFactory) {
    throw new Error(
      `Unsupported provider: ${provider}`,
    );
  }

  if (provider === "kimi") {
    return (providerFactory as unknown as (
      model: string,
      options: { useResponsesApi: boolean },
    ) => ModelInstance)(model, {
      useResponsesApi: false,
    });
  }

  return providerFactory(model);
}