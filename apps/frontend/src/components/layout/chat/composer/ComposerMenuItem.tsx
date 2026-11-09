"use client";

import { FileIcon, FolderIcon } from "@react-symbols/icons/utils";

import { cn } from "@loveble/utils";

import { ComposerIcon } from "./ComposerIcon";
import type { ComposerSource } from "./types";
import { BRANDS, GLYPHS } from "./omposer-data-icons";

export function ComposerMenuItem({
  row,
  index,
  source,
  active,
  connected,
  onMouseDown,
  onMouseEnter,
  onClick,
  onConnect,
}: {
  row: {
    key: string;
    name: string;
    desc: string;
    fileType?: "file" | "folder";
  };
  index: number;
  source?: ComposerSource;
  active: boolean;
  connected: boolean;
  onMouseDown: () => void;
  onMouseEnter: () => void;
  onClick: () => void;
  onConnect?: () => void;
}) {
  return (
    <button
      type="button"
      data-row={index}
      onMouseDown={(event) => {
        event.preventDefault();
        onMouseDown();
      }}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={cn(
        "relative z-10 flex h-8 w-full items-center gap-2 rounded-md px-2 text-left",
        "transition-colors duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:bg-foreground/[0.06]",
        active && "bg-foreground/[0.06]"
      )}
    >
      {row.fileType ? (
        <span className="flex size-5 shrink-0 items-center justify-center">
          {row.fileType === "folder" ? (
            <FolderIcon folderName={row.name} className="size-4 shrink-0" />
          ) : (
            <FileIcon fileName={row.name} autoAssign className="size-4 shrink-0" />
          )}
        </span>
      ) : (
        source && (
          <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
            {source.brand ? (
              BRANDS[source.brand]
            ) : (
              <ComposerIcon size={15}>
                {GLYPHS[source.glyph ?? "clip"]}
              </ComposerIcon>
            )}
          </span>
        )
      )}

      <span className="max-w-[58%] min-w-0 shrink-0 truncate text-[13px] font-medium text-foreground">
        {row.name}
      </span>

      <span className="min-w-0 flex-1 truncate text-[11.5px] text-muted-foreground">
        {row.desc}
      </span>

      {source?.connect && (
        <span
          role="button"
          tabIndex={-1}
          onClick={(event) => {
            event.stopPropagation();
            onConnect?.();
          }}
          className={cn(
            "shrink-0 text-[11.5px] font-medium transition-colors duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none",
            /* Brand kit: body text must be AA — onyx on light surfaces (AAA). */
            connected
              ? "text-foreground"
              : "text-foreground underline underline-offset-2 hover:no-underline"
          )}
        >
          {connected ? "Connected" : "Connect"}
        </span>
      )}
    </button>
  );
}