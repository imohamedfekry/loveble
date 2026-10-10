import { createTool } from '@mastra/core/tools';
import { cleanCrawledItems } from 'src/common/scraping/crawl-pipeline';
import { crawl } from 'src/common/scraping/crawl.service';
import { normalize } from 'src/common/scraping/Normalize.helper';

const SEARCH_TIMEOUT_MS = 15_000;

type JsonSchema = {
  $schema: string;
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

// Mastra's `createTool` expects a Standard Schema that ALSO exposes
// `~standard.jsonSchema` (a "StandardSchemaWithJSON"). Raw valibot schemas
// don't expose that, so Mastra serialized valibot's internal representation
// as if it were JSON Schema — producing a malformed `tools[].parameters`
// payload that the provider rejected with HTTP 400. That's why the chat stream
// never produced a single token (and never persisted). This adapter wraps a
// plain JSON Schema into the exact shape Mastra converts correctly.
function jsonSchemaInput<Input>(schema: JsonSchema) {
  return {
    '~standard': {
      version: 1,
      vendor: 'loveble-json-schema',
      validate: (value: unknown) => ({
        success: true as const,
        value: value as Input,
      }),
      jsonSchema: {
        input: () => schema,
        output: () => schema,
      },
    },
  } as never;
}

function describeError(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return `${fallback}: timed out`;
    }
    return `${fallback}: ${error.message}`;
  }
  return fallback;
}

export const searchAgentTool = createTool({
  id: 'web-search',
  description: 'Web search using SearXNG (no API key, self-hosted)',
  inputSchema: jsonSchemaInput<{ query: string }>({
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
    },
    required: ['query'],
    additionalProperties: false,
  }),
  execute: async ({ query }) => {
    const startedAt = Date.now();
    console.log(`[tool] web-search start query="${query}"`);
    try {
      const url = new URL('http://localhost:8080/search');
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'json');
      url.searchParams.set('language', 'en');
      url.searchParams.set('engines', 'bing');

      const res = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; SquadraBot/1.0)',
        },
        signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
      });

      if (!res.ok) {
        throw new Error(`SearXNG search failed: ${res.status}`);
      }

      const data = (await res.json()) as {
        results?: Array<{ title?: string; url?: string; content?: string }>;
      };
      const results = (data.results ?? []).slice(0, 5).map((r) => ({
        title: r.title ?? '',
        url: r.url ?? '',
        snippet: r.content ?? '',
      }));
      console.log(
        `[tool] web-search done in ${Date.now() - startedAt}ms results=${results.length}`,
      );
      return results;
    } catch (error) {
      console.error(
        `[tool] web-search failed after ${Date.now() - startedAt}ms:`,
        error,
      );
      return { error: describeError(error, 'Web search failed') };
    }
  },
});

export const crawlAgentTool = createTool({
  id: 'web-crawl',
  description: `Crawl a webpage URL and return cleaned markdown content.

Use this tool whenever:
- the user provides a URL
- the user asks about website content
- documentation pages need to be analyzed`,
  inputSchema: jsonSchemaInput<{ url: string }>({
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      url: {
        type: 'string',
        format: 'uri',
        description: 'Full URL to crawl',
      },
    },
    required: ['url'],
    additionalProperties: false,
  }),
  execute: async ({ url }) => {
    const startedAt = Date.now();
    console.log(`[tool] web-crawl start url=${url}`);
    try {
      const raw = await crawl([url]);
      const items = normalize(raw);
      const dataset = cleanCrawledItems(items).map((page) => ({
        ...page,
        content: page.content.slice(0, 15000),
      }));
      console.log(`[tool] web-crawl done in ${Date.now() - startedAt}ms`);
      return dataset[0] ?? null;
    } catch (error) {
      console.error(
        `[tool] web-crawl failed after ${Date.now() - startedAt}ms:`,
        error,
      );
      return { error: describeError(error, 'Web crawl failed') };
    }
  },
});
