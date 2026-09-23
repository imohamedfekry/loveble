import { z } from 'zod';
import { createTool } from '@inngest/agent-kit';
import { cleanCrawledItems } from 'src/common/scraping/crawl-pipeline';
import { crawl } from 'src/common/scraping/crawl.service';
import { normalize } from 'src/common/scraping/Normalize.helper';

export const searchAgentTool = createTool({
  name: 'search',
  description: 'Web search using SearXNG (no API key, self-hosted)',
  parameters: z.object({
    query: z.string().describe('Search query'),
  }),
  handler: async ({ query }) => {
    const url = new URL('http://localhost:8181/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('language', 'en');

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; SquadraBot/1.0)',
      },
    });

    if (!res.ok) {
      throw new Error(`SearXNG search failed: ${res.status}`);
    }

    const data = (await res.json()) as {
      results?: Array<{ title?: string; url?: string; content?: string }>;
    };
    return (data.results ?? []).slice(0, 5).map((r) => ({
      title: r.title ?? '',
      url: r.url ?? '',
      snippet: r.content ?? '',
    }));
  },
});

export const crawlAgentTool = createTool({
  name: 'crawl',
  description: `Crawl a webpage URL and return cleaned markdown content.

Use this tool whenever:
- the user provides a URL
- the user asks about website content
- documentation pages need to be analyzed`,
  parameters: z.object({
    url: z.string().url().describe('Full URL to crawl'),
  }),
  handler: async ({ url }) => {
    const raw = await crawl([url]);
    const items = normalize(raw);
    const dataset = cleanCrawledItems(items).map((page) => ({
      ...page,
      content: page.content.slice(0, 15000),
    }));
    return dataset[0] ?? null;
  },
});
