import {
  TransformStream,
  type ReadableStream as WebReadableStream,
} from 'node:stream/web';

/**
 * Console bridge between the previewed website and the terminal panel.
 *
 * The preview is served through our proxy, so the HTML document can be given a
 * tiny reporter script. It forwards uncaught errors, unhandled rejections and
 * `console.error` / `console.warn` calls to `PREVIEW_REPORTER_PATH` on the same
 * origin; the proxy hands them to {@link PreviewLogService}, which streams them
 * into the project's terminal session.
 */

/** Endpoint (relative to the preview origin) that receives browser events. */
export const PREVIEW_REPORTER_PATH = '/__loveble/console';

/** How much of an HTML document we buffer while looking for `</head>`. */
const LOOKAHEAD_CHARS = 64 * 1024;
/** Tail kept while scanning so a chunk boundary cannot hide `</head>`. */
const SCAN_TAIL_CHARS = 4 * 1024;

const HEAD_END = /<\/head\s*>/i;
const HEAD_OPEN = /<head\b[^>]*>/i;
const BODY_END = /<\/body\s*>/i;

const REPORTER_SOURCE = String.raw`
(function () {
  try {
    if (window.__lovebleConsoleReporter) return;
    window.__lovebleConsoleReporter = true;

    var ENDPOINT = "__LOVEBLE_REPORT_PATH__";
    // Keep batches well under the 64 KB keepalive limit of fetch().
    var BATCH = 10;
    var PER_MINUTE = 120;
    var queue = [];
    var windowStart = Date.now();
    var windowCount = 0;
    var lastText = "";
    var lastAt = 0;

    function clean(value, depth) {
      try {
        if (value === null || value === undefined) return "";
        var type = typeof value;
        if (type === "string") return value.slice(0, 1500);
        if (type === "number" || type === "boolean") return String(value);
        if (type === "function") return "[function " + (value.name || "anonymous") + "]";
        if (value instanceof Error) {
          return (value.name + ": " + value.message + (value.stack ? "\n" + value.stack : "")).slice(0, 1500);
        }
        var level = depth || 0;
        if (level > 2) return "[object]";
        if (Array.isArray(value)) {
          return "[" + value.slice(0, 10).map(function (item) {
            return clean(item, level + 1);
          }).join(", ") + "]";
        }
        var keys = Object.keys(value).slice(0, 12);
        return "{ " + keys.map(function (key) {
          var out;
          try { out = clean(value[key], level + 1); } catch (error) { out = "[unreadable]"; }
          return key + ": " + out;
        }).join(", ") + " }";
      } catch (error) {
        return "[unreadable]";
      }
    }

    function flush() {
      if (!queue.length) return;
      var payload = JSON.stringify({ events: queue.splice(0, BATCH) });
      try {
        if (typeof fetch !== "function") return;
        fetch(ENDPOINT, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: payload,
          keepalive: true,
          credentials: "same-origin"
        }).catch(function () {});
      } catch (error) {}
    }

    function record(level, text) {
      try {
        if (!text) return;
        var now = Date.now();
        if (now - windowStart > 60000) {
          windowStart = now;
          windowCount = 0;
        }
        if (windowCount >= PER_MINUTE) return;
        var body = String(text).slice(0, 2000);
        if (body === lastText && now - lastAt < 2000) return;
        lastText = body;
        lastAt = now;
        windowCount += 1;
        queue.push({
          level: level,
          message: body,
          url: String(location.pathname + location.search).slice(0, 300),
          at: now
        });
        if (queue.length >= BATCH) flush();
      } catch (error) {}
    }

    window.addEventListener("error", function (event) {
      try {
        var target = event.target;
        if (target && target !== window && (target.src || target.href)) {
          record("error", "failed to load " + String(target.tagName || "resource").toLowerCase() + ": " + String(target.src || target.href));
          return;
        }
        var where = event.filename
          ? " (" + event.filename + ":" + event.lineno + ":" + event.colno + ")"
          : "";
        var stack = event.error && event.error.stack ? "\n" + event.error.stack : "";
        record("error", (event.message || "Uncaught error") + where + stack);
      } catch (error) {}
    }, true);

    window.addEventListener("unhandledrejection", function (event) {
      try {
        record("error", "Unhandled rejection: " + clean(event.reason));
      } catch (error) {}
    });

    var originalError = console.error;
    if (typeof originalError === "function") {
      console.error = function () {
        try {
          record("error", Array.prototype.slice.call(arguments).map(function (item) {
            return clean(item);
          }).join(" "));
        } catch (error) {}
        return originalError.apply(console, arguments);
      };
    }

    var originalWarn = console.warn;
    if (typeof originalWarn === "function") {
      console.warn = function () {
        try {
          record("warn", Array.prototype.slice.call(arguments).map(function (item) {
            return clean(item);
          }).join(" "));
        } catch (error) {}
        return originalWarn.apply(console, arguments);
      };
    }

    setInterval(flush, 500);
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") flush();
    });
  } catch (error) {}
})();
`;

/** `<script>` tag that installs the reporter on a preview document. */
export function previewReporterSnippet(reportPath: string): string {
  const source = REPORTER_SOURCE.replace(
    '"__LOVEBLE_REPORT_PATH__"',
    JSON.stringify(reportPath),
  );
  return `<script>${source}</script>`;
}

/** Inject the reporter into an already-buffered HTML document. */
export function injectReporterHtml(html: string, snippet: string): string {
  const head = HEAD_END.exec(html);
  if (head) {
    return html.slice(0, head.index) + snippet + html.slice(head.index);
  }
  const headOpen = HEAD_OPEN.exec(html);
  if (headOpen) {
    const at = headOpen.index + headOpen[0].length;
    return html.slice(0, at) + snippet + html.slice(at);
  }
  const body = BODY_END.exec(html);
  if (body) {
    return html.slice(0, body.index) + snippet + html.slice(body.index);
  }
  return html + snippet;
}

/**
 * Inject the reporter while the document streams, so SSR streaming keeps
 * working (the response is never fully buffered).
 */
export function injectReporterStream(
  body: ReadableStream<Uint8Array>,
  snippet: string,
): WebReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let injected = false;
  let carry = '';

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      if (injected) {
        controller.enqueue(chunk);
        return;
      }

      carry += decoder.decode(chunk, { stream: true });
      const head = HEAD_END.exec(carry);
      if (head) {
        controller.enqueue(
          encoder.encode(
            carry.slice(0, head.index) + snippet + carry.slice(head.index),
          ),
        );
        carry = '';
        injected = true;
        return;
      }

      // Head is far away (or missing): stream through, keep a small tail so
      // the tag cannot be split across the boundary we just released.
      if (carry.length > LOOKAHEAD_CHARS) {
        const flushable = carry.slice(0, carry.length - SCAN_TAIL_CHARS);
        controller.enqueue(encoder.encode(flushable));
        carry = carry.slice(carry.length - SCAN_TAIL_CHARS);
      }
    },
    flush(controller) {
      if (injected) return;
      const head = HEAD_END.exec(carry);
      const tail = head
        ? carry.slice(0, head.index) + snippet + carry.slice(head.index)
        : carry + snippet;
      if (tail) controller.enqueue(encoder.encode(tail));
      carry = '';
      injected = true;
    },
  });

  const stream = body as unknown as WebReadableStream<Uint8Array>;
  return stream.pipeThrough(transform);
}
