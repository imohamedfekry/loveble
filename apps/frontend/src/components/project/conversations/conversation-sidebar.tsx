"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PlusIcon,
  HistoryIcon,
} from "lucide-react";
import { useConversations } from "@/lib/hooks/conversations/useConversations";
import { useMessages, sendMessageToConversation } from "@/lib/hooks/conversations/useConversations";
import { useMessagesStore } from "@/store/messages.store";
import { MessageBubble } from "./messages/message-bubble";
import { ChatComposer } from "@/components/layout/chat/composer/ChatComposer";
import { Button } from "@loveble/ui/button";
import type { Message } from "@/store/messages.store";

const EMPTY_MESSAGES: Message[] = [];

interface ConversationItem {
  id: string;
  title: string;
}

export function ConversationSidebar({
  projectId,
}: {
  projectId: string;
}) {
  const [activeConversationId, setActiveConversationId] = useState<bigint | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [showConversationList, setShowConversationList] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const { getByProject, createConversation } = useConversations(projectId);
  const getMessages = useMessages(activeConversationId).getMessages;

  const allMessages = useMessagesStore((s) =>
    activeConversationId
      ? s.messagesByConversation.get(activeConversationId) ?? EMPTY_MESSAGES
      : EMPTY_MESSAGES,
  );

  // Load conversations for this project and auto-select the first one so the
  // messages area and the composer are usable immediately.
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

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
  }, [projectId, getByProject]);

  // Auto-load messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      getMessages().catch((err) => {
        console.error("[ConversationSidebar] failed to load messages:", err);
      });
    }
  }, [activeConversationId, getMessages]);

  const handleCreateConversation = useCallback(async () => {
    const result = await createConversation("New conversation");
    const conv = result?.data?.conversation;
    if (conv?.id) {
      setConversations((prev) => [{ id: String(conv.id), title: conv.title }, ...prev]);
      setActiveConversationId(BigInt(conv.id));
      setShowConversationList(false);
    }
  }, [createConversation]);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(BigInt(id));
    setShowConversationList(false);
  }, []);

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
          const result = await createConversation("New conversation");
          const conv = result?.data?.conversation;
          if (!conv?.id) return;
          convId = BigInt(conv.id);
          setConversations((prev) => [{ id: String(conv.id), title: conv.title }, ...prev]);
          setActiveConversationId(convId);
        }
        await sendMessageToConversation(convId, content, "user");
      } catch (err) {
        console.error("[ConversationSidebar] send failed:", err);
        setInput(content);
      } finally {
        setSending(false);
      }
    },
    [activeConversationId, createConversation, sending],
  );

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Header */}
      <div className="h-12 flex items-center justify-between border-b px-3">
        <div className="text-sm font-medium">
          {activeConversationId ? "Conversation" : "New conversation"}
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
            <button
              key={conv.id}
              onClick={() => handleSelectConversation(conv.id)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
            >
              <div className="truncate">{conv.title}</div>
            </button>
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
    </div>
  );
}
