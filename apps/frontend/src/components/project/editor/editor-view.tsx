import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";
import { AlertTriangleIcon, FileWarningIcon } from "lucide-react";
import { CodeEditor } from "./code-editor";
import { FileBreadcrumbs } from "./file-breadcrumbs";
import { TopNavigation } from "./top-navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useEditor } from "@/lib/hooks/use-editor";
import { useFile, useFileContent } from "@/lib/hooks/file/useFiles";
import { useCollaboration } from "@/lib/socket/hooks/useCollaboration";
import { serializeSelections } from "@/lib/socket/collab-protocol";
import { useSocketStatus } from "@/lib/socket/socket-store";

const DEBOUNCE_MS = 1500;

function generateClientID(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function isTextContent(contentType: string): boolean {
  const type = contentType.toLowerCase();

  if (type.startsWith("text/")) return true;

  return [
    "application/json",
    "application/javascript",
    "application/x-javascript",
    "application/xml",
    "application/xhtml+xml",
    "application/sql",
    "application/graphql",
    "application/typescript",
    "application/wasm",
  ].some((mime) => type.startsWith(mime));
}

function EditorSkeleton() {
  return (
    <div className="flex h-full overflow-hidden bg-[var(--editor-bg)]">
      {/* Gutter - يحاكي cm-gutters مع تنويع بسيط حسب عدد الخانات */}
      <div className="hidden sm:flex w-[52px] shrink-0 flex-col items-end gap-[16px] border-r bg-[var(--editor-gutter-bg)] py-4 pr-3">
        {Array.from({ length: 20 }).map((_, i) => {
          const isSingleDigit = i < 9; // 1-9 رقم واحد، 10+ رقمين
          // تنويع بسيط 2px داخل كل مجموعة عشان ما يبانش ثابت تماماً
          const w = isSingleDigit ? 12 + (i % 2) * 2 : 18 + (i % 2) * 2;
          return (
            <Skeleton
              key={i}
              className="h-3 rounded-[3px]"
              style={{ width: `${w}px`, opacity: 0.9 - i * 0.032 }}
            />
          );
        })}
      </div>

      {/* Code area - يحاكي cm-content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 px-4 py-4 sm:pl-5 pr-6">
          <div className="flex flex-col gap-[16px]">
            {/* import line */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-14 rounded-[3px]" />
              <Skeleton className="h-3 w-20 rounded-[3px] opacity-80" />
              <Skeleton className="h-3 w-7 rounded-[3px] opacity-50" />
              <Skeleton className="h-3 w-32 rounded-[3px]" />
              <Skeleton className="h-3 w-10 rounded-[3px] opacity-60" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-14 rounded-[3px] opacity-70" />
              <Skeleton className="h-3 w-28 rounded-[3px]" />
              <Skeleton className="h-3 w-16 rounded-[3px] opacity-50" />
            </div>

            <div className="h-1" />

            {/* const declaration */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-12 rounded-[3px]" />
              <Skeleton className="h-3 w-24 rounded-[3px]" />
              <Skeleton className="h-3 w-3 rounded-[3px] opacity-40" />
              <Skeleton className="h-3 w-20 rounded-[3px] opacity-90" />
              <Skeleton className="h-3 w-2 rounded-[3px] opacity-30" />
              <Skeleton className="h-3 w-16 rounded-[3px] opacity-70" />
            </div>
            <div className="flex items-center gap-2 pl-6">
              <Skeleton className="h-3 w-16 rounded-[3px] opacity-60" />
              <Skeleton className="h-3 w-36 rounded-[3px]" />
              <Skeleton className="h-3 w-12 rounded-[3px] opacity-40" />
            </div>
            <div className="flex items-center gap-2 pl-6">
              <Skeleton className="h-3 w-20 rounded-[3px] opacity-80" />
              <Skeleton className="h-3 w-8 rounded-[3px] opacity-40" />
              <Skeleton className="h-3 w-24 rounded-[3px]" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-[3px] opacity-40" />
            </div>

            <div className="h-1" />

            {/* function */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-16 rounded-[3px]" />
              <Skeleton className="h-3 w-28 rounded-[3px]" />
              <Skeleton className="h-3 w-20 rounded-[3px] opacity-70" />
              <Skeleton className="h-3 w-3 rounded-[3px] opacity-40" />
            </div>
            <div className="flex items-center gap-2 pl-6">
              <Skeleton className="h-3 w-10 rounded-[3px] opacity-80" />
              <Skeleton className="h-3 w-32 rounded-[3px]" />
              <Skeleton className="h-3 w-12 rounded-[3px] opacity-50" />
            </div>
            <div className="flex items-center gap-2 pl-6">
              <Skeleton className="h-3 w-6 rounded-[3px] opacity-60" />
              <Skeleton className="h-3 w-40 rounded-[3px]" />
            </div>
            <div className="flex items-center gap-2 pl-10">
              <Skeleton className="h-3 w-20 rounded-[3px] opacity-80" />
              <Skeleton className="h-3 w-14 rounded-[3px]" />
              <Skeleton className="h-3 w-24 rounded-[3px] opacity-50" />
            </div>
            <div className="flex items-center gap-2 pl-10">
              <Skeleton className="h-3 w-16 rounded-[3px] opacity-60" />
              <Skeleton className="h-3 w-28 rounded-[3px] opacity-90" />
            </div>
            <div className="flex items-center gap-2 pl-6 opacity-90">
              <Skeleton className="h-3 w-14 rounded-[3px]" />
            </div>
            <div className="flex items-center gap-2 pl-6 opacity-70">
              <Skeleton className="h-3 w-28 rounded-[3px]" />
              <Skeleton className="h-3 w-20 rounded-[3px] opacity-60" />
            </div>
            <div className="flex items-center gap-2 opacity-45">
              <Skeleton className="h-3 w-3 rounded-[3px]" />
            </div>
            <div className="flex items-center gap-2 opacity-30">
              <Skeleton className="h-3 w-24 rounded-[3px]" />
              <Skeleton className="h-3 w-16 rounded-[3px]" />
              <Skeleton className="h-3 w-12 rounded-[3px]" />
            </div>
          </div>
        </div>

        {/* bottom fade - يدي احساس ان في محتوى لسه تحت */}
        <div className="pointer-events-none h-10 shrink-0 bg-gradient-to-t from-[var(--editor-bg)] to-transparent" />
      </div>

      {/* minimap faint hint - زي الـ minimap الحقيقي في CodeEditor */}
      <div className="hidden lg:flex w-16 shrink-0 flex-col gap-1.5 border-l bg-[var(--editor-bg)] px-2 py-4 opacity-40">
        {Array.from({ length: 18 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-1 rounded-full"
            style={{
              width: `${40 + (i % 4) * 12}%`,
              opacity: 0.7 - i * 0.03,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function BinaryFileNotice({ fileName }: { fileName: string }) {
  return (
    <div className="size-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-2.5 max-w-md text-center px-6">
        <FileWarningIcon className="size-10 text-yellow-500" />
        <p className="text-sm text-foreground">
          <span className="font-medium">{fileName}</span> is a binary file and
          cannot be shown in the code editor.
        </p>
      </div>
    </div>
  );
}

export const EditorView = ({ projectId }: { projectId: string }) => {
  const { activeTabId } = useEditor(projectId);
  const activeFile = useFile(projectId, activeTabId);
  const isActiveFileText = activeFile?.type === "file";

  const { content, error } = useFileContent(
    projectId,
    isActiveFileText ? activeTabId : null,
  );

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clientID = useMemo(() => generateClientID(), []);
  const socketStatus = useSocketStatus();
  const canJoinCollab =
    Boolean(activeTabId) &&
    Boolean(content) &&
    socketStatus === "connected";

  const { setView, snapshot, peers, sendAwareness } = useCollaboration({
    fileId: canJoinCollab ? (activeTabId ?? null) : null,
    projectId,
    initialContent: content?.content ?? "",
    clientID,
  });

  const collabConfig = useMemo(() => {
    if (!snapshot || socketStatus !== "connected") return undefined;

    return {
      clientID,
      startVersion: snapshot.version,
    };
  }, [snapshot, socketStatus, clientID]);

  useEffect(() => {
    const timeout = timeoutRef.current;

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [activeTabId]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center">
        <TopNavigation projectId={projectId} />
      </div>
      {activeTabId && <FileBreadcrumbs projectId={projectId} />}
      <div className="flex-1 min-h-0 bg-card">
        {!activeFile && !activeTabId && (
          <div className="size-full flex items-center justify-center">
            <Image
              src="/logo.svg"
              alt="loveble Logo"
              width={50}
              height={50}
              loading="eager"
              className="opacity-25"
            />
          </div>
        )}

        {!activeFile && activeTabId && <EditorSkeleton />}

        {activeFile && activeFile.type === "folder" && (
          <div className="size-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2.5 max-w-md text-center px-6">
              <AlertTriangleIcon className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Folders cannot be opened in the editor.
              </p>
            </div>
          </div>
        )}

        {activeFile &&
          activeFile.type === "file" &&
          !error &&
          !content && <EditorSkeleton />}

        {activeFile &&
          activeFile.type === "file" &&
          error && (
            <div className="size-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-2.5 max-w-md text-center px-6">
                <AlertTriangleIcon className="size-10 text-destructive" />
                <p className="text-sm text-foreground">
                  Failed to load file content.
                </p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
            </div>
          )}

        {activeFile &&
          activeFile.type === "file" &&
          !error &&
          content &&
          !isTextContent(content.contentType) && (
            <BinaryFileNotice fileName={activeFile.name} />
          )}

        {activeFile &&
          activeFile.type === "file" &&
          !error &&
          content &&
          isTextContent(content.contentType) &&
          socketStatus === "connected" &&
          !snapshot && <EditorSkeleton />}

        {activeFile &&
          activeFile.type === "file" &&
          !error &&
          content &&
          isTextContent(content.contentType) &&
          (snapshot || socketStatus !== "connected") && (
            <CodeEditor
              key={`${activeFile.id}:${snapshot?.version ?? "offline"}`}
              fileName={activeFile.name}
              initialValue={snapshot?.document ?? content.content}
              collaboration={collabConfig}
              peers={peers}
              onLocalAwareness={sendAwareness}
              onViewReady={(view) => {
                setView(view);
                if (!view) return;
                sendAwareness({
                  selection: serializeSelections(
                    view.state.selection.ranges,
                    view.state.selection.mainIndex,
                  ),
                });
              }}
            />
          )}
      </div>
    </div>
  );
};
