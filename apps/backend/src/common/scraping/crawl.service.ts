export async function crawl(urls: string[]) {
  const res = await fetch("http://localhost:11235/crawl", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      urls,
      bypass_cache: true,
      extract_links: false,
    }),
  });

  return res.json();
}