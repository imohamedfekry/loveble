"use client";

import { FileText, X } from "lucide-react";

import { cn } from "@/lib/utils";

import type { ComposerAttachment, ComposerVariant } from "./types";

export function ComposerAttachments({
  attachments,
  variant,
  onRemove,
}: {
  attachments: ComposerAttachment[];
  variant: ComposerVariant;
  onRemove: (id: string) => void;
}) {
  if (attachments.length === 0) return null;

  const pill = variant === "Pill";

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5 pt-0.5",
        pill ? "px-1" : "px-0.5"
      )}
    >
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className={cn(
            "group flex h-7 items-center gap-1.5",
            "bg-card border border-border px-1.5 py-1",
            "text-[11.5px] text-foreground",
            pill ? "rounded-full" : "rounded-lg"
          )}
        >
          <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />

          <span className="max-w-36 truncate">
            {attachment.file.name}
          </span>

          <button
            type="button"
            aria-label={`Remove ${attachment.file.name}`}
            onClick={() => onRemove(attachment.id)}
            className={cn(
              "flex h-4 w-4 items-center justify-center",
              "text-muted-foreground transition-colors",
              "hover:bg-foreground/5 hover:text-foreground",
              pill ? "rounded-full" : "rounded"
            )}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      ))}
    </div>
  );
}