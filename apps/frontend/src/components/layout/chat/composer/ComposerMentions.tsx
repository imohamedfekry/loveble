"use client";

import { X } from "lucide-react";
import { FileIcon, FolderIcon } from "@react-symbols/icons/utils";

import { cn } from "@loveble/utils";

import type { ChatContextItem } from "@/store/chat-context.store";
import type { ComposerVariant } from "./types";

function mentionLabel(mention: ChatContextItem) {
  if (mention.kind === "selection") {
    return `${mention.path}:${mention.lineStart}-${mention.lineEnd}`;
  }
  if (mention.kind === "folder") {
    return `${mention.path}/`;
  }
  return mention.path;
}

export function ComposerMentions({
  mentions,
  variant,
  onRemove,
  onOpen,
}: {
  mentions: ChatContextItem[];
  variant: ComposerVariant;
  onRemove: (id: string) => void;
  onOpen?: (mention: ChatContextItem) => void;
}) {
  if (mentions.length === 0) return null;

  const pill = variant === "Pill";

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5",
        pill ? "px-1" : "px-0.5"
      )}
    >
      {mentions.map((mention) => {
        const label = mentionLabel(mention);
        const openable = Boolean(onOpen) && mention.kind !== "folder";

        return (
          <div
            key={mention.id}
            className={cn(
              "group flex h-7 items-center gap-1.5",
              "bg-primary/10 border border-primary/20 px-1.5 py-1",
              "text-[11.5px] text-foreground",
              pill ? "rounded-full" : "rounded-lg"
            )}
          >
            <button
              type="button"
              disabled={!openable}
              onClick={() => openable && onOpen?.(mention)}
              title={openable ? `Open ${label}` : label}
              className={cn(
                "flex min-w-0 items-center gap-1.5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70",
                openable
                  ? "cursor-pointer hover:underline underline-offset-2"
                  : "cursor-default",
                pill ? "rounded-full" : "rounded"
              )}
            >
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                {mention.type === "folder" ? (
                  <FolderIcon
                    folderName={mention.name}
                    className="size-3.5 shrink-0"
                  />
                ) : (
                  <FileIcon
                    fileName={mention.name}
                    autoAssign
                    className="size-3.5 shrink-0"
                  />
                )}
              </span>

              <span className="max-w-48 truncate">{label}</span>
            </button>

            <button
              type="button"
              aria-label={`Remove ${label}`}
              onClick={() => onRemove(mention.id)}
              className={cn(
                "-m-0.5 flex size-4 items-center justify-center",
                "text-muted-foreground transition-[background-color,color,scale] duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none",
                "hover:bg-foreground/10 hover:text-foreground",
                "active:scale-[0.96]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70",
                pill ? "rounded-full" : "rounded"
              )}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
