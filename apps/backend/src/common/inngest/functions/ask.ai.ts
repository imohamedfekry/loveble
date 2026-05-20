import { inngest } from "../client";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText as aiGenerateText } from "ai";

import { crawl } from "src/common/scraping/crawl.service";
import { normalize } from "src/common/scraping/Normalize.helper";
import { cleanHTMLToMarkdown } from "src/common/scraping/clean.service";

const URL_REGEX = /(https?:\/\/[^\s]+)/g;
const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";

export const generateText: any = inngest.createFunction(
  {
    id: "generate-text",
    name: "AI Generate With Web Context",
    retries: 3,
    triggers: [{ event: "text/generate" }],
  },

  async ({ event, step }) => {
    // Validate API key
    if (!API_KEY) {
      throw new Error(
        "GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set"
      );
    }

    const google = createGoogleGenerativeAI({
      apiKey: API_KEY,
    });

    const userPrompt = event.data.prompt;

    // 1. Extract URLs
    const urls: string[] = (userPrompt.match(URL_REGEX) ?? []) as string[];
    console.log("Extracted URLs:", urls);

    // 2. Crawl URLs
    const scrapedData =
      urls.length > 0
        ? await step.run("crawl-urls", async () => {
            // crawl
            const raw = await crawl(urls);

            // normalize
            const items = normalize(raw);

            // clean
            const dataset = items
              .map((item: any) => {
                try {
                  const html = item.html || item.content || "";
                  const url = item.url || item.sourceURL || "";

                  if (!html) return null;

                  const cleaned = cleanHTMLToMarkdown(html, url);

                  return {
                    url,
                    title: cleaned.title,
                    content: cleaned.markdown,
                  };
                } catch {
                  return null;
                }
              })
              .filter(Boolean);

            return dataset;
          })
        : [];

    // 3. Build AI Context
    const scrapedContext = scrapedData
      .map(
        (item: any) => `
# Source
URL: ${item.url}

Title: ${item.title}

Content:
${item.content}
`
      )
      .join("\n\n----------------------\n\n");

    // 4. Final Prompt
    const finalPrompt = `
You are an AI assistant.

Use the scraped web context below if relevant.

========================
WEB CONTEXT
========================

${scrapedContext}

========================
USER PROMPT
========================

${userPrompt}
`;

    // 5. Generate
    const result = await step.run("generate-ai-response", async () => {
      const { text, usage, finishReason } = await aiGenerateText({
        model: google("gemini-2.5-flash"),
        prompt: finalPrompt,
        temperature: 0.7,
      });

      return {
        text,
        usage,
        finishReason,
      };
    });

    return {
      success: true,
      urls,
      scrapedPages: scrapedData.length,
      response: result.text,
      usage: result.usage,
    };
  }
);