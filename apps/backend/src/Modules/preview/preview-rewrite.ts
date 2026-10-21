/**
 * Response rewriter for the preview proxy.
 *
 * The preview app runs behind `/api/v1/preview/<projectId>` but thinks it is
 * served from the site root, so it emits root-absolute asset URLs
 * (`/src/main.jsx`, `/@vite/client`, ...). Those would bypass the proxy and
 * 404. We prefix every root-absolute URL in HTML/JS/CSS responses with the
 * public preview prefix so the browser routes it back through us, and the proxy
 * strips the prefix again before talking to the app.
 */

const HTML_TEXT = /text\/html/i;
const JS_TEXT = /(application|text)\/(x-)?(java|ecma)script/i;
const CSS_TEXT = /text\/css/i;

/** Add the preview prefix to a root-absolute URL (leave relatives/others). */
export function prefixUrl(url: string, prefix: string): string {
  if (!url.startsWith('/')) return url; // relative, data:, http(s):, #
  if (url.startsWith('//')) return url; // protocol-relative
  if (url === prefix || url.startsWith(`${prefix}/`)) return url;
  return prefix + url;
}

function rewriteHtml(body: string, prefix: string): string {
  return body
    .replace(
      /(\b(?:src|href)\s*=\s*)(["'])(\/[^"']*)\2/gi,
      (_match, attr: string, quote: string, url: string) =>
        `${attr}${quote}${prefixUrl(url, prefix)}${quote}`,
    )
    .replace(
      /(\bsrcset\s*=\s*)(["'])([^"']*)\2/gi,
      (_match, attr: string, quote: string, list: string) => {
        const rewritten = list
          .split(',')
          .map((item) => {
            const trimmed = item.trim();
            if (!trimmed) return trimmed;
            const [url, ...descriptor] = trimmed.split(/\s+/);
            const next = prefixUrl(url, prefix);
            return [next, ...descriptor].join(' ');
          })
          .join(', ');
        return `${attr}${quote}${rewritten}${quote}`;
      },
    )
    .replace(
      /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
      (_match, attrs: string, content: string) => {
        // External scripts are covered by the attribute rewrite above.
        if (/\bsrc\s*=/i.test(attrs)) return _match;
        return `<script${attrs}>${rewriteJs(content, prefix)}</script>`;
      },
    );
}

function rewriteJs(body: string, prefix: string): string {
  // import "/x", import("/x"), from "/x", export ... from "/x"
  return body.replace(
    /(\bfrom\s*|\bimport\s*\(?\s*)(["'])(\/[^"']*)\2/g,
    (_match, kw: string, quote: string, url: string) =>
      `${kw}${quote}${prefixUrl(url, prefix)}${quote}`,
  );
}

function rewriteCss(body: string, prefix: string): string {
  return body
    .replace(
      /(url\(\s*)(["']?)(\/[^"')]*)\2(\s*\))/gi,
      (_match, open: string, quote: string, url: string, close: string) =>
        `${open}${quote}${prefixUrl(url, prefix)}${quote}${close}`,
    )
    .replace(
      /(@import\s*)(["'])(\/[^"']*)\2/gi,
      (_match, at: string, quote: string, url: string) =>
        `${at}${quote}${prefixUrl(url, prefix)}${quote}`,
    );
}

/** Rewrite a text response body based on its content type. */
export function rewriteBody(
  body: string,
  contentType: string,
  prefix: string,
): string {
  if (CSS_TEXT.test(contentType)) return rewriteCss(body, prefix);
  if (HTML_TEXT.test(contentType)) return rewriteHtml(body, prefix);
  if (JS_TEXT.test(contentType)) return rewriteJs(body, prefix);
  return body;
}

/** Whether a response body should be buffered and rewritten. */
export function isRewritable(contentType: string): boolean {
  return (
    HTML_TEXT.test(contentType) ||
    JS_TEXT.test(contentType) ||
    CSS_TEXT.test(contentType)
  );
}
