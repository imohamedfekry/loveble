"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PlusIcon,
  HistoryIcon,
  TrashIcon,
} from "lucide-react";
import { useConversations } from "@/lib/hooks/conversations/useConversations";
import { useMessages, sendMessageToConversation, sendFirstMessage } from "@/lib/hooks/conversations/useConversations";
import { useMessagesStore } from "@/store/messages.store";
import {
  useConversationsStore,
  type ConversationItem,
} from "@/store/conversations.store";
import { MessageBubble } from "./messages/message-bubble";
import { ChatComposer } from "@/components/layout/chat/composer/ChatComposer";
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
import type { Message } from "@/store/messages.store";

const EMPTY_MESSAGES: Message[] = [];

export function ConversationSidebar({
  projectId,
}: {
  projectId: string;
}) {
  const [activeConversationId, setActiveConversationId] = useState<bigint | null>(null);
  const [showConversationList, setShowConversationList] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

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

  const { getByProject, updateConversation, deleteConversation } =
    useConversations(projectId);
  const getMessages = useMessages(activeConversationId).getMessages;

  const activeConversation = activeConversationId
    ? conversations.find((c) => BigInt(c.id) === activeConversationId)
    : undefined;

  const allMessages = useMessagesStore((s) =>
    activeConversationId
      ? s.messagesByConversation.get(activeConversationId) ?? EMPTY_MESSAGES
      : EMPTY_MESSAGES,
  );

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

  // Always-available send: creates the conversation lazily on first message.
  // ChatComposer clears its own input right after onSend, so on failure we
  // restore the text here.
  const handleSend = useCallback(
    async (payload: { text: string; files: File[] }) => {
      const content = payload.text.trim();
      if (!content || sending) return;
      setSending(true);
      try {
        let convId = activeConversationId;
        if (!convId) {
          const result = await sendFirstMessage(projectId, content);
          const conv = result?.conversation;
          if (!conv?.id) return;
          convId = BigInt(conv.id);
          addConversation({ id: String(conv.id), title: conv.title ?? null });
          setActiveConversationId(convId);
        } else {
          await sendMessageToConversation(convId, content);
        }
        // The newest message makes this the most recently active conversation.
        bumpConversation(String(convId));
      } catch (err) {
        console.error("[ConversationSidebar] send failed:", err);
        setInput(content);
      } finally {
        setSending(false);
      }
    },
    [activeConversationId, addConversation, bumpConversation, projectId, sending],
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

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {allMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">
              No messages yet. Start a conversation!
            </p>
          </div>
        ) : (
          allMessages.map((message: Message) => (
            <MessageBubble key={String(message.id)} message={message} />
          ))
        )}
      </div>

      {/* Message Composer */}
      <div className="border-t p-3">
        <ChatComposer
          value={input}
          onChange={setInput}
          onSend={handleSend}
          sending={sending}
        />
      </div>

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
