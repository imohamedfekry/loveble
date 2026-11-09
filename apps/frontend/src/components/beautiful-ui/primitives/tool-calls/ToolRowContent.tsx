import { FileIcon, FolderIcon } from "@react-symbols/icons/utils";

import type { ProjectFileType } from "@/lib/api/apis/files/types";

import { ToolIcon } from "./ToolIcon";
import type { Detail } from "./types";

/**
 * The visual body of one tool row — tool icon, friendly label, and the
 * file / command / search it touched. Shared by the tool timeline and the
 * nested team-run rows so both read as tools, never as prose.
 */
export function ToolRowContent({
  base,
  label,
  running,
  failed,
  detail,
  node,
}: {
  /** Bare tool id — picks the icon. */
  base: string;
  label: string;
  running: boolean;
  failed: boolean;
  detail?: Detail;
  node?: ProjectFileType;
}) {
  const canOpen = node?.type === "file";

  return (
    <>
      <span className="flex size-4 shrink-0 items-center justify-center">
        {running ? (
          <span
            className="size-3 rounded-full border-[1.5px] border-line-strong border-t-ink-2"
            style={{ animation: "spin 700ms linear infinite" }}
          />
        ) : (
          <ToolIcon
            base={base}
            className={`size-4 ${failed ? "text-red" : "text-ink-3"}`}
          />
        )}
      </span>

      <span className="min-w-0 shrink-0 truncate text-[12.5px] font-medium text-ink">
        {label}
      </span>

      {detail?.kind === "file" && (
        <span
          className="inline-flex h-5.5 min-w-0 max-w-60 items-center gap-1 rounded-chip bg-field px-1.5 font-mono text-[11.5px] text-ink-2 shadow-hairline"
          title={detail.path}
        >
          {detail.isFolder ? (
            <FolderIcon folderName={detail.name} className="size-4 shrink-0" />
          ) : (
            <FileIcon
              fileName={detail.name}
              autoAssign
              className="size-4 shrink-0"
            />
          )}
          <span className="truncate">{detail.name}</span>
        </span>
      )}

      {detail?.kind === "code" && (
        <span className="min-w-0 flex-1 truncate rounded-chip bg-field px-1.5 font-mono text-[11.5px] text-ink-2 shadow-hairline">
          {detail.text}
        </span>
      )}

      {detail?.kind === "search" && (
        <span className="min-w-0 flex-1 truncate text-[12px] text-ink-3">
          {detail.text}
        </span>
      )}

      {canOpen && (
        <span className="ml-auto shrink-0 text-[11px] text-ink-3 opacity-0 transition-opacity duration-150 group-hover/row:opacity-100">
          Open
        </span>
      )}
    </>
  );
}
