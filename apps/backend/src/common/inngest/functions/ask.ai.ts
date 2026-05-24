import { inngest } from "../client";

import { createGoogleGenerativeAI } from "@ai-sdk/google";

import { generateText as aiGenerateText, stepCountIs } from "ai";
import { crawlTool } from "src/ai/tools/crawl.tool";
import { searchTool } from "src/ai/tools/webSearch.tool";


const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";

export const generateText = inngest.createFunction(
  {
    id: "generate-text",
    name: "AI Agent Generate",
    retries: 3,
    triggers: [{ event: "text/generate" }],
  },

  async ({ event }) => {
    if (!API_KEY) {
      throw new Error(
        "GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set"
      );
    }

    const google = createGoogleGenerativeAI({
      apiKey: API_KEY,
    });

    const result = await aiGenerateText({
      model: google("gemini-2.5-flash"),

      system: `
      You are a helpful AI assistant.

      IMPORTANT:
      - If the user provides URLs,
      use the crawlTool automatically.
      - Analyze webpage content carefully before answering.
      `,

      prompt: event.data.prompt,

      tools: {
        crawlTool,
        searchTool,
      },

      stopWhen: stepCountIs(5),
      temperature: 0.7,
    });
    console.dir(result.steps, { depth: null });
    return {
      success: true,
      response: result.text,
      usage: result.usage,
      steps: result.steps,
    };
  }
);