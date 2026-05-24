import * as v from "valibot";
import { tool } from "ai";
import { valibotSchema } from "@ai-sdk/valibot";

import { crawl } from "src/common/scraping/crawl.service";
import { normalize } from "src/common/scraping/Normalize.helper";
import { cleanHTMLToMarkdown } from "src/common/scraping/clean.service";

export const crawlTool = tool({
  description: `
  Crawl a webpage URL and return cleaned markdown content.

  Use this tool whenever:
  - the user provides a URL
  - the user asks about website content
  - documentation pages need to be analyzed
  `,

  inputSchema: valibotSchema(
    v.object({
      url: v.pipe(v.string(), v.url()),
    })
  ),

  execute: async ({ url }) => {
    const raw = await crawl([url]);

    const items = normalize(raw);

    const dataset = items
      .map((item: any) => {
        try {
          const html = item.html || item.content || "";
          const pageUrl = item.url || item.sourceURL || "";

          if (!html) return null;

          const cleaned = cleanHTMLToMarkdown(html, pageUrl);

          return {
            url: pageUrl,
            title: cleaned.title,
            content: cleaned.markdown.slice(0, 15000), // IMPORTANT
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return dataset[0] ?? null;
  },
});