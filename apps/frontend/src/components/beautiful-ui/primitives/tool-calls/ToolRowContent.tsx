import { FileIcon, FolderIcon } from "@react-symbols/icons/utils";

import type { ProjectFileType } from "@/lib/api/apis/files/types";

import type { Detail } from "./types";

/**
 * The visual body of one tool row — status glyph, friendly label, and the
 * file / command / search it touched. Shared by the tool timeline and the
 * nested team-run rows so both read as tools, never as prose.
 */
export function ToolRowContent({
  label,
  running,
  failed,
  detail,
  node,
}: {
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
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={failed ? "text-red" : "text-ink-3"}
          >
            {failed ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M20 6L9 17l-5-5" />
            )}
          </svg>
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
