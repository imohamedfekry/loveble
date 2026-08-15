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
            "bg-neutral-900 px-1.5 py-1",
            "text-[11.5px] text-neutral-300",
            "shadow-[0_0_0_1px_rgba(255,255,255,0.05)]",
            pill ? "rounded-full" : "rounded-lg"
          )}
        >
          <FileText className="h-3 w-3 shrink-0 text-neutral-400" />

          <span className="max-w-36 truncate">
            {attachment.file.name}
          </span>

          <button
            type="button"
            aria-label={`Remove ${attachment.file.name}`}
            onClick={() => onRemove(attachment.id)}
            className={cn(
              "flex h-4 w-4 items-center justify-center",
              "text-neutral-500 transition-colors",
              "hover:bg-neutral-800 hover:text-neutral-200",
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