import * as v from 'valibot';
import { tool } from 'ai';
import { valibotSchema } from '@ai-sdk/valibot';

import { cleanCrawledItems } from 'src/common/scraping/crawl-pipeline';
import { crawl } from 'src/common/scraping/crawl.service';
import { normalize } from 'src/common/scraping/Normalize.helper';

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
    }),
  ),

  execute: async ({ url }) => {
    const raw = await crawl([url]);

    const items = normalize(raw);

    const dataset = cleanCrawledItems(items).map((page) => ({
      ...page,
      content: page.content.slice(0, 15000),
    }));

    return dataset[0] ?? null;
  },
});
