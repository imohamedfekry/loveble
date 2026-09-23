import { cleanHTMLToMarkdown } from './clean.service';
import { crawl } from './crawl.service';
import { normalize } from './Normalize.helper';

export type CrawledPage = {
  url: string;
  title: string;
  content: string;
};

export function cleanCrawledItems(items: unknown[]): CrawledPage[] {
  return items
    .map((item: any) => {
      try {
        const html = item.html || item.content || '';
        const url = item.url || item.sourceURL || '';

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
    .filter((page): page is CrawledPage => page !== null);
}

export async function runCrawlPipeline(urls: string[]): Promise<{
  count: number;
  data: CrawledPage[];
}> {
  const raw = await crawl(urls);
  const items = normalize(raw);
  const dataset = cleanCrawledItems(items);

  return {
    count: dataset.length,
    data: dataset,
  };
}
