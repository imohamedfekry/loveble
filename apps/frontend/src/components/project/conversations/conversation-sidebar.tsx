"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  PlusIcon,
  HistoryIcon,
  TrashIcon,
} from "lucide-react";
import { useConversations, useMessages } from "@/lib/hooks/conversations/useConversations";
import { useMessagesStore } from "@/store/messages.store";
import {
  useConversationsStore,
  type ConversationItem,
} from "@/store/conversations.store";
import { ChatPanel } from "./chat-panel";
import { Button } from "@loveble/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@loveble/ui/alert-dialog";
import { Spinner } from "@loveble/ui/spinner";
import { toast } from "sonner";
import type { ChatMessage, Message } from "@/store/messages.store";

const EMPTY_MESSAGES: Message[] = [];

export function ConversationSidebar({
  projectId,
}: {
  projectId: string;
}) {
  const [activeConversationId, setActiveConversationId] = useState<bigint | null>(null);
  const [showConversationList, setShowConversationList] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ConversationItem | null>(null);
  const [deleteTitle, setDeleteTitle] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const conversations = useConversationsStore((s) => s.conversations);
  const setConversations = useConversationsStore((s) => s.setConversations);
  const addConversation = useConversationsStore((s) => s.addConversation);
  const patchConversation = useConversationsStore((s) => s.updateConversation);
  const removeConversation = useConversationsStore((s) => s.removeConversation);
  const bumpConversation = useConversationsStore((s) => s.bumpConversation);
  const streamsByConversation = useMessagesStore((s) => s.streamsByConversation);

  const { getByProject, updateConversation, deleteConversation } =
    useConversations(projectId);
  const getMessages = useMessages(activeConversationId).getMessages;

  const activeConversation = activeConversationId
    ? conversations.find((c) => BigInt(c.id) === activeConversationId)
    : undefined;

  const streamingConversation = Array.from(streamsByConversation.entries())
    .filter(
      ([id, streams]) =>
        BigInt(id) !== activeConversationId && streams.size > 0,
    )
    .map(([id]) => id)[0];

  const streamingTarget = streamingConversation
    ? conversations.find((c) => BigInt(c.id) === streamingConversation)
    : undefined;

  const storeMessages = useMessagesStore((s) =>
    activeConversationId
      ? s.messagesByConversation.get(activeConversationId) ?? EMPTY_MESSAGES
      : EMPTY_MESSAGES,
  );
  const activeStreams = useMessagesStore((s) =>
    activeConversationId ? s.streamsByConversation.get(activeConversationId) : undefined,
  );
  const allMessages = useMemo<ChatMessage[]>(() => {
    if (activeConversationId === null || storeMessages === EMPTY_MESSAGES) {
      return storeMessages;
    }
    if (!activeStreams || activeStreams.size === 0) return storeMessages;
    return [...storeMessages, ...activeStreams.values()];
  }, [activeConversationId, activeStreams, storeMessages]);

  // Load conversations for this project and auto-select the first one so the
  // messages area and the composer are usable immediately. The server orders
  // them by last activity (latest message first).
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    setConversations([]);

    getByProject()
      .then((result) => {
        if (cancelled) return;
        const list = result?.data?.conversations;
        if (!list) return;
        const items: ConversationItem[] = list.map((c: any) => ({
          id: String(c.id),
          title: c.title,
        }));
        setConversations(items);
        setActiveConversationId((prev) => prev ?? (items[0] ? BigInt(items[0].id) : null));
      })
      .catch((err) => {
        console.error("[ConversationSidebar] failed to load conversations:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, getByProject, setConversations]);

  // If the active conversation disappears (deleted here or from another
  // session), fall back to the most recently active remaining one.
  useEffect(() => {
    if (!activeConversationId) return;
    const exists = conversations.some(
      (c) => BigInt(c.id) === activeConversationId,
    );
    if (!exists) {
      setActiveConversationId(
        conversations[0] ? BigInt(conversations[0].id) : null,
      );
    }
  }, [activeConversationId, conversations]);

  // Auto-load messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      getMessages().catch((err) => {
        console.error("[ConversationSidebar] failed to load messages:", err);
      });
    }
  }, [activeConversationId, getMessages]);

  const handleCreateConversation = useCallback(() => {
    setActiveConversationId(null);
    setShowConversationList(false);
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(BigInt(id));
    setShowConversationList(false);
  }, []);

  const handleDeleteConversation = useCallback(async () => {
    if (!deleteTarget || deleteLoading) return;

    setDeleteLoading(true);
    try {
      removeConversation(deleteTarget.id);
      await deleteConversation(BigInt(deleteTarget.id));
    } catch (error) {
      console.error("[ConversationSidebar] delete failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete conversation",
      );
    } finally {
      setDeleteLoading(false);
      setDeleteOpen(false);
    }
  }, [deleteConversation, deleteLoading, deleteTarget, removeConversation]);

  const startEditing = useCallback(() => {
    if (!activeConversation) return;
    setTitleValue(activeConversation.title ?? "");
    setIsEditing(true);
  }, [activeConversation]);

  const cancelEditing = useCallback(() => {
    setTitleValue("");
    setIsEditing(false);
  }, []);

  const saveEditing = useCallback(async () => {
    if (isSaving || !activeConversation) return;

    const trimmed = titleValue.trim();

    if (!trimmed || trimmed === activeConversation.title) {
      cancelEditing();
      return;
    }

    try {
      setIsSaving(true);

      await updateConversation(BigInt(activeConversation.id), {
        title: trimmed,
      });

      patchConversation(activeConversation.id, trimmed);

      setIsEditing(false);
    } catch (error) {
      console.error("[ConversationSidebar] rename failed:", error);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }, [activeConversation, cancelEditing, isSaving, patchConversation, titleValue, updateConversation]);

  const handleConversationCreated = useCallback(
    (item: ConversationItem) => {
      addConversation(item);
    },
    [addConversation],
  );

  const handleActiveConversationChange = useCallback(
    (id: bigint) => {
      setActiveConversationId(id);
      bumpConversation(String(id));
    },
    [bumpConversation],
  );

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Header */}
      <div className="h-12 flex items-center justify-between gap-2 border-b px-3">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              autoFocus
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={saveEditing}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  saveEditing();
                }

                if (e.key === "Escape") {
                  cancelEditing();
                }
              }}
              className="h-7 w-full max-w-56 rounded-md border border-border bg-muted px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/30"
            />
          ) : (
            <div
              onDoubleClick={startEditing}
              className="relative cursor-text truncate rounded px-1 py-0.5 text-sm font-medium"
              title="Double click to rename"
            >
              {activeConversation?.title || "New conversation"}

              {isSaving && (
                <div className="absolute inset-0 rounded bg-accent/20 backdrop-blur-[1px] animate-pulse" />
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon-xs"
            variant="highlight"
            onClick={() => setShowConversationList(!showConversationList)}
          >
            <HistoryIcon className="size-3.5" />
          </Button>
          <Button
            size="icon-xs"
            variant="highlight"
            onClick={handleCreateConversation}
          >
            <PlusIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Conversation List Dropdown */}
      {showConversationList && (
        <div className="border-b max-h-48 overflow-y-auto">
          {conversations.map((conv) => (
            <div key={conv.id} className="group relative">
              <button
                onClick={() => handleSelectConversation(conv.id)}
                className="w-full truncate px-3 py-2 pr-8 text-left text-sm hover:bg-muted/50 transition-colors"
              >
                <span className="block truncate">{conv.title || "New conversation"}</span>
              </button>
              <button
                type="button"
                aria-label="Delete conversation"
                title="Delete conversation"
                onClick={() => {
                  setDeleteTarget(conv);
                  setDeleteTitle(conv.title?.trim() || "conversation");
                  setDeleteOpen(true);
                }}
                className="absolute right-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
              >
                <TrashIcon className="size-3.5" />
              </button>
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No conversations yet
            </div>
          )}
        </div>
      )}

      {/* Chat panel */}
      <div className="min-h-0 flex-1">
        <ChatPanel
          projectId={projectId}
          conversationId={activeConversationId}
          messages={allMessages}
          onConversationCreated={handleConversationCreated}
          onActiveConversationChange={handleActiveConversationChange}
        />
      </div>

      {/* Live-reply banner for streams happening in another conversation */}
      {streamingTarget && streamingConversation ? (
        <div className="flex items-center justify-between gap-2 border-t bg-accent/40 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">
              AI replies in &ldquo;{streamingTarget.title || "New conversation"}&rdquo;
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSelectConversation(String(streamingConversation))}
          >
            View
          </Button>
        </div>
      ) : null}

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!deleteLoading) setDeleteOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteTitle}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The conversation and its messages
              will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteConversation}
              disabled={deleteLoading}
            >
              {deleteLoading ? <Spinner className="size-3.5" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
