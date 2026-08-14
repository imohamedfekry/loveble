"use client";

import { FileText, X } from "lucide-react";

import { cn } from "@/lib/utils";

import type { ChatAttachment } from "./types";

export function ChatAttachmentPreview({
  attachments,
  onRemove,
}: {
  attachments: ChatAttachment[];
  onRemove: (id: string) => void;
}) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 border-b border-white/6 pb-3">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className={cn(
            "group relative overflow-hidden rounded-xl",
            "ring-1 ring-white/10",
            attachment.type === "image" ? "h-16 w-16" : "max-w-44"
          )}
        >
          {attachment.type === "image" && attachment.previewUrl ? (
            <img
              src={attachment.previewUrl}
              alt={attachment.file.name}
              className="h-full w-full object-cover outline outline-1 -outline-offset-1 outline-white/10"
            />
          ) : (
            <div className="flex items-center gap-2 bg-neutral-900/80 px-2.5 py-2">
              <FileText className="h-4 w-4 shrink-0 text-neutral-400" />
              <span className="truncate text-xs text-neutral-300">
                {attachment.file.name}
              </span>
            </div>
          )}

          <button
            type="button"
            data-composer-control
            aria-label={`Remove ${attachment.file.name}`}
            onClick={() => onRemove(attachment.id)}
            className={cn(
              "absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full",
              "bg-black/70 text-neutral-200 opacity-0",
              "transition-[opacity,transform] duration-(--duration-quick) ease-out",
              "group-hover:opacity-100 hover:scale-105 active:scale-95"
            )}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
