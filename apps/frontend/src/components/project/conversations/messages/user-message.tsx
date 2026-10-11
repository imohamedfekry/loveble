import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { FileIcon, FolderIcon } from "@react-symbols/icons/utils";

import { cn } from "@loveble/utils";

import { MENTION_PATTERN } from "@/lib/chat-context";
import { Message } from "@/store/messages.store";

interface UserMessageProps {
  message: Message;
  onOpenPath?: (path: string) => void;
}

function parseMentions(content: string) {
  const mentions = Array.from(content.matchAll(MENTION_PATTERN)).map(
    (match) => match[1],
  );
  const text = content
    .replace(MENTION_PATTERN, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { mentions, text };
}

function mentionMeta(token: string) {
  const isFolder = token.endsWith("/");
  const clean = isFolder ? token.slice(0, -1) : token;
  const [path] = clean.split(":");
  const name = path.split("/").pop() || path;
  return { isFolder, name, path };
}

export function UserMessage({ message, onOpenPath }: UserMessageProps) {
  const raw = message.content?.trim();
  if (!raw) return null;

  const { mentions, text } = parseMentions(raw);

  return (
    <div className="flex justify-end">
      <div className="min-w-0 rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-[13.5px] leading-relaxed text-primary-foreground shadow-hairline">
        {text && (
          <Streamdown
            mode="static"
            dir="auto"
            plugins={{ code }}
            shikiTheme={["github-light", "github-dark"]}
            codeBlockMaxHeight={320}
            className="[overflow-wrap:anywhere] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_[data-streamdown=link]]:text-primary-foreground! [&_[data-streamdown=link]]:underline [&_[data-streamdown=link]]:underline-offset-2 [&_pre]:my-1.5 [&_code]:font-mono"
          >
            {text}
          </Streamdown>
        )}

        {mentions.length > 0 && (
          <div className={cn("flex flex-wrap gap-1.5", text && "mt-2")}>
            {mentions.map((mention, index) => {
              const { isFolder, name, path } = mentionMeta(mention);
              const openable = Boolean(onOpenPath) && !isFolder;

              return (
                <button
                  key={`${mention}-${index}`}
                  type="button"
                  disabled={!openable}
                  onClick={() => openable && onOpenPath?.(path)}
                  title={openable ? `Open ${mention}` : mention}
                  className={cn(
                    "inline-flex max-w-full items-center gap-1 rounded-md bg-primary-foreground/15 px-1.5 py-0.5 text-[11.5px]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70",
                    openable
                      ? "cursor-pointer transition-colors duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none hover:bg-primary-foreground/25"
                      : "cursor-default"
                  )}
                >
                  <span className="flex size-3.5 shrink-0 items-center justify-center">
                    {isFolder ? (
                      <FolderIcon
                        folderName={name}
                        className="size-3.5 shrink-0"
                      />
                    ) : (
                      <FileIcon
                        fileName={name}
                        autoAssign
                        className="size-3.5 shrink-0"
                      />
                    )}
                  </span>
                  <span className="truncate">{mention}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
