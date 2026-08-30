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
    <div className="flex h-full flex-col gap-3 p-6">
      <div className="flex items-center gap-2">
        <Skeleton className="size-4 rounded" />
        <Skeleton className="h-3.5 w-36 rounded" />
      </div>

      <div className="mt-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-10 rounded" />
          <Skeleton className="h-3.5 flex-1 rounded" />
          <Skeleton className="h-3.5 w-24 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-10 rounded" />
          <Skeleton className="h-3.5 flex-[0.7] rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-10 rounded" />
          <Skeleton className="h-3.5 flex-[0.9] rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-10 rounded" />
          <Skeleton className="h-3.5 flex-[0.5] rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-10 rounded" />
          <Skeleton className="h-3.5 flex-[0.85] rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-10 rounded" />
          <Skeleton className="h-3.5 flex-[0.6] rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-10 rounded" />
          <Skeleton className="h-3.5 flex-[0.75] rounded" />
        </div>
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
