"use client";

import { X } from "lucide-react";
import { FileIcon } from "@react-symbols/icons/utils";

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
        "flex flex-wrap gap-1.5",
        pill ? "px-1" : "px-0.5"
      )}
    >
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className={cn(
            "group flex h-7 items-center gap-1.5",
            "bg-foreground/[0.05] border border-border px-1.5 py-1",
            "text-[11.5px] text-foreground",
            pill ? "rounded-full" : "rounded-lg"
          )}
        >
          <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
            <FileIcon
              fileName={attachment.file.name}
              autoAssign
              className="size-3.5 shrink-0"
            />
          </span>

          <span className="max-w-36 truncate">
            {attachment.file.name}
          </span>

          <button
            type="button"
            aria-label={`Remove ${attachment.file.name}`}
            onClick={() => onRemove(attachment.id)}
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
      ))}
    </div>
  );
}