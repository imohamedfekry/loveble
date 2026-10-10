const CRAWL_TIMEOUT_MS = 30_000;

export async function crawl(urls: string[]): Promise<unknown> {
  const res = await fetch('http://localhost:11235/crawl', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      urls,
      bypass_cache: true,
      extract_links: false,
    }),
    signal: AbortSignal.timeout(CRAWL_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Crawl service failed: ${res.status}`);
  }

  return (await res.json()) as unknown;
}
