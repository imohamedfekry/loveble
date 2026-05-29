import { inngest }
  from "../client";

import {
  generateText as aiGenerateText,
  stepCountIs,
} from "ai";

import { crawlTool }
  from "src/ai/tools/crawl.tool";

import { searchTool }
  from "src/ai/tools/webSearch.tool";

import { captureErrors }
  from "../inngest.middleware";

import { getModel }
  from "src/ai/providers";

import type {
  ModelId,
} from "src/ai/providers/types";

import {
  classifyProviderError,
  shouldFallbackOn,
} from "src/ai/provider-fallback";

export const generateText =
  inngest.createFunction(
    {
      id: "generate-text",

      name:
        "AI Agent Generate",

      retries: 3,

      triggers: [
        {
          event:
            "text/generate",
        },
      ],
    },

    async ({ event }) => {
      return captureErrors(
        async () => {

          const modelId =
            (event.data.model as ModelId) ??
            "google:gemini-2.5-flash";

          const prompt = event.data.prompt;

          const run = async (chosenModelId: ModelId) => {
            const model = getModel(chosenModelId);
            return aiGenerateText({
              model,
              prompt,
              tools: {
                crawlTool,
                searchTool,
              },
              stopWhen: stepCountIs(5),
              experimental_telemetry: {
                isEnabled: true,
                metadata: {
                  model: chosenModelId,
                  source: "inngest",
                },
              },
            });
          };

          const tried: Array<{
            model: ModelId;
            decision?: ReturnType<typeof classifyProviderError>;
          }> = [];

          const getNextFallback = (current: ModelId): ModelId | null => {
            if (current.startsWith("kimi:")) return "google:gemini-2.5-flash";
            if (current.startsWith("google:")) return "openai:gpt-4o-mini";
            return null; // openai -> stop
          };

          let current: ModelId = modelId;
          // At most 3 attempts: Kimi -> Google -> OpenAI
          for (let i = 0; i < 3; i++) {
            try {
              if (i > 0) {
                console.warn(
                  `[AI] fallback attempt #${i + 1} using ${current}`,
                );
              } else {
                console.log(`[AI] using ${current}`);
              }

              const result = await run(current);
              return {
                success: true,
                model: current,
                response: result.text,
              };
            } catch (error) {
              const decision = classifyProviderError(error);
              tried.push({ model: current, decision });

              console.warn(
                `[AI] provider failed (${current})`,
                decision,
              );

              // If it's a permanent billing/quota issue, do not retry the same provider.
              // Still allowed to fallback to the next provider.
              if (!shouldFallbackOn(decision)) {
                throw error;
              }

              const next = getNextFallback(current);
              if (!next) {
                // Final provider failed.
                if (decision.kind === "permanent") {
                  // Don't let Inngest retry permanent failures.
                  return {
                    success: false,
                    model: current,
                    error: {
                      type: decision.kind,
                      reason: decision.reason,
                      statusCode: decision.statusCode,
                      message: decision.message,
                      tried,
                    },
                  };
                }

                // Transient/unknown: allow Inngest retries by throwing a clear error.
                throw new Error(
                  JSON.stringify(
                    {
                      message: "AI providers failed",
                      lastProvider: current,
                      lastError: decision,
                      tried,
                    },
                    null,
                    2,
                  ),
                );
              }

              current = next;
            }
          }

          // Should never reach here.
          throw new Error("AI provider fallback exceeded max attempts");

        },

        {
          eventId:
            event.id,

          eventName:
            event.name,

          eventData:
            event.data,
        },
      );
    },
  );