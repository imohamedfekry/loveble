import { createGoogleGenerativeAI }
from "@ai-sdk/google";

import { createAnthropic }
from "@ai-sdk/anthropic";

import { createOpenAI }
from "@ai-sdk/openai";

import { createOpenAICompatible }
from "@ai-sdk/openai-compatible";

export const modelRegistry = {
  google: createGoogleGenerativeAI({
    apiKey:
      process.env
        .GOOGLE_GENERATIVE_AI_API_KEY,
  }),

  openai: createOpenAI({
    apiKey:
      process.env.OPENAI_API_KEY,
  }),

  anthropic: createAnthropic({
    apiKey:
      process.env.ANTHROPIC_API_KEY,
  }),

  kimi: createOpenAICompatible({
    name: "kimi",

    apiKey:
      process.env.KIMI_API_KEY!,

    baseURL:
      "https://api.moonshot.ai/v1",
  }),
};