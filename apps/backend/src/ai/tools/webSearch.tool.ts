import { valibotSchema } from '@ai-sdk/valibot';
import { tool } from 'ai';
import * as v from 'valibot';

type SearchInput = {
  query: string;
};

type SearchOutput = {
  title: string;
  url: string;
  snippet: string;
}[];

export const searchTool = tool({
  description: 'Web search using SearXNG (no API key, self-hosted)',
  inputSchema: valibotSchema(
    v.object({
      query: v.string(),
    }),
  ),

  execute: async ({ query }): Promise<SearchOutput> => {
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
    });

    if (!res.ok) {
      console.log('SearXNG search failed with status:', res.status);
      throw new Error(`SearXNG search failed: ${res.status}`);
    }

    const data = await res.json();
    return (data.results || []).slice(0, 5).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
    }));
  },
});
