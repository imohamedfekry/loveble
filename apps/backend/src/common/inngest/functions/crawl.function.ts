import { cleanHTMLToMarkdown } from "src/common/scraping/clean.service";
import { crawl } from "src/common/scraping/crawl.service";
import { normalize } from "src/common/scraping/Normalize.helper";
import { inngest } from "../client";
import fs from "fs";
export const crawlFunction = inngest.createFunction(
  {
    id: "crawl-pipeline",
    name: "Crawl AI Clean Pipeline",
    retries: 2,
    triggers: [{ event: "crawl/run" }],
  },

  async ({ event, step }) => {
    const urls = event.data.urls;

    // 1. crawl
    const raw = await step.run("crawl", async () => {
      return crawl(urls);
    });

    // 2. normalize
    const items = await step.run("normalize", async () => {
      return normalize(raw);
    });

    // 3. clean
    const dataset = await step.run("clean", async () => {
      return items
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
    });
    // const readmeContent = dataset.map((item) => `## ${item.title}\n\n${item.content}`).join("\n\n");
    // fs.writeFileSync("readmeee.md", readmeContent);
    // console.log("Dataset:", dataset);
    return {
      count: dataset.length,
      data: dataset, 
    };
  }
);