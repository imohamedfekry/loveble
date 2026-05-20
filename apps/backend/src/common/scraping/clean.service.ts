import TurndownService from "turndown";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

function cleanMarkdown(md: string) {
  return md
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\[\]\(.*?\)/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "") // remove images (optional)
    .trim();
}

export function cleanHTMLToMarkdown(html: string, url = "") {
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;

  // remove junk
  const junkSelectors = [
    "script",
    "style",
    "nav",
    "footer",
    "aside",
    "form",
    "iframe",
    "header",
  ];

  junkSelectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => el.remove());
  });

  const reader = new Readability(document);
  const article = reader.parse();

  if (!article?.content) {
    return {
      title: "Untitled",
      markdown: "",
    };
  }

  // convert to markdown
  const contentDom = new JSDOM(article.content);
  const contentDoc = contentDom.window.document;

  let md = turndown.turndown(contentDoc.body.innerHTML);
  md = cleanMarkdown(md);

  // 🔥 EXTRACT LINKS FOR TOP SECTION
const links = Array.from(contentDoc.querySelectorAll("a"))
  .slice(0, 10)
  .map((a) => {
    const el = a as HTMLAnchorElement;

    return {
      text: el.textContent?.trim(),
      href: el.getAttribute("href"),
    };
  })
  .filter((l) => l.text && l.href);
  
  const topLinks = links
    .map((l) => `*   [${l.text}](${l.href})`)
    .join("\n");

  // 🔥 SPLIT SECTIONS (simulate docs style)
  const sections = md.split("\n## ").map((s, i) => {
    if (i === 0) return s;
    return `## ${s}`;
  });

  const formatted = `
---

## 🌐 ${url}

### 📌 ${article.title || "Documentation"}

${topLinks ? topLinks + "\n" : ""}

${sections.join("\n\n")}
`.trim();

  return {
    title: article.title || "Untitled",
    markdown: formatted,
  };
}