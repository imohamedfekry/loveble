"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { DivideIcon, SparklesIcon } from "lucide-react";
import { StreamText } from "@/components/beautiful-ui";
import {
  ToolCalls,
  type ToolPart,
} from "@/components/beautiful-ui/primitives/ToolCalls";
import { ChatComposer } from "@/components/layout/chat/composer/ChatComposer";
import { API_BASE_URL } from "@/lib/api/api-fetch";
import { socket } from "@/lib/socket/socket";
import {
  sendAssistantMessageToConversation,
  sendFirstMessage,
  sendMessageToConversation,
} from "@/lib/hooks/conversations/useConversations";
import {
  useMessagesStore,
  isStreamMessage,
  type ChatMessage,
  type Message,
  type StreamMessage,
} from "@/store/messages.store";
import type { ConversationItem } from "@/store/conversations.store";
import { UserMessage } from "./messages/user-message";

const chatTransport = new DefaultChatTransport({
  api: `${API_BASE_URL}/ai/chat`,
  credentials: "include",
});

const STREAM_RELAY_INTERVAL_MS = 80;
const STALL_TIMEOUT_MS = 45_000;

function textFromParts(parts: UIMessage["parts"]): string {
  let result = "";
  for (const part of parts) {
    if (part.type === "text") result += part.text;
  }
  return result;
}

function reasoningFromParts(parts: UIMessage["parts"]): string {
  let result = "";
  for (const part of parts) {
    if (part.type === "reasoning") result += (part as { text: string }).text;
  }
  return result;
}

function reasoningIsStreaming(
  parts: UIMessage["parts"],
  fallback: boolean,
): boolean {
  let seen = false;
  let allDone = true;
  for (const part of parts) {
    if (part.type !== "reasoning") continue;
    seen = true;
    const state = (part as { state?: string }).state;
    if (state === "streaming") return true;
    if (state !== "done") allDone = false;
  }
  if (!seen) return false;
  return allDone ? false : fallback;
}

function toolPartsFromParts(parts: UIMessage["parts"]): ToolPart[] {
  const result: ToolPart[] = [];
  for (const part of parts) {
    if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
      const p = part as { [key: string]: unknown; type: string };
      result.push({
        type: p.type,
        toolCallId: typeof p.toolCallId === "string" ? p.toolCallId : undefined,
        toolName: typeof p.toolName === "string" ? p.toolName : undefined,
        state: typeof p.state === "string" ? p.state : undefined,
        input: p.input,
        output: p.output,
        errorText: typeof p.errorText === "string" ? p.errorText : undefined,
      });
    }
  }
  return result;
}

function ThinkingDot() {
  return <span aria-hidden className="stream-caret is-streaming" />;
}

function AssistantShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-start">
      <div className="min-w-0 text-[13.5px] leading-relaxed text-ink ">
        {children}
      </div>
    </div>
  );
}

function MarkdownText({
  text,
  loading,
}: {
  text: string;
  loading: boolean;
}) {
  if (!text) return null;
  return (
    <Streamdown
      mode={loading ? "streaming" : "static"}
      isAnimating={loading}
      caret={loading ? "block" : undefined}
      dir="auto"
      parseIncompleteMarkdown={loading}
      plugins={{ code }}
      shikiTheme={["github-light", "github-dark"]}
      codeBlockMaxHeight={360}
      className="[overflow-wrap:anywhere] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_pre]:my-2 [&_code]:font-mono"
    >
      {text}
    </Streamdown>
  );
}

function ReasoningBlock({ text, loading }: { text: string; loading: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="-mx-1.5 flex items-center gap-1.5 rounded-control px-1.5 py-1 text-[12.5px] text-ink-2 transition-colors duration-100 hover:bg-hover-2"
      >
        <SparklesIcon className="size-3.5" />
        <span className="font-medium">Reasoning</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-200"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="mt-1.5 rounded-2xl border border-line bg-surface/60 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-2">
          {loading ? (
            <StreamText
              text={text}
              caret={false}
              charsPerTick={Math.max(2, Math.round(text.length / 100))}
              tickMs={6}
              className="[overflow-wrap:anywhere]"
            />
          ) : (
            <span className="[overflow-wrap:anywhere]">{text}</span>
          )}
        </div>
      )}
    </div>
  );
}

function AssistantReplyView({
  parts,
  loading,
}: {
  parts: UIMessage["parts"];
  loading: boolean;
}) {
  const tools = toolPartsFromParts(parts);
  const reasoning = reasoningFromParts(parts);
  const reasoningStreaming = reasoningIsStreaming(parts, loading);
  const content = textFromParts(parts);
  const showThinking = loading && !content && tools.length === 0;

  return (
    <AssistantShell>
      {tools.length > 0 && <ToolCalls parts={tools} className="mb-2.5" />}
      {reasoning && <ReasoningBlock text={reasoning} loading={reasoningStreaming} />}
      {showThinking ? (
        <span className="inline-flex items-center gap-1 py-1 text-ink-2">
          Working
          <ThinkingDot />
        </span>
      ) : (
        <MarkdownText text={content} loading={loading} />
      )}
    </AssistantShell>
  );
}

function StoredMessageView({ message }: { message: Message }) {
  if (message.role === "user") {
    return <UserMessage message={message} />;
  }
  const parts: UIMessage["parts"] = Array.isArray(message.parts)
    ? (message.parts as UIMessage["parts"])
    : message.content
      ? [{ type: "text", text: message.content }]
      : [];
  if (parts.length === 0) {
    return (
      <AssistantShell>
        <span className="text-xs italic text-ink-2">…</span>
      </AssistantShell>
    );
  }
  return <AssistantReplyView parts={parts} loading={false} />;
}

function StreamMessageView({ message }: { message: StreamMessage }) {
  return (
    <AssistantReplyView
      parts={message.parts as UIMessage["parts"]}
      loading={message.status === "streaming"}
    />
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2.5 px-6 text-center">
      <div className="flex size-11 items-center justify-center rounded-2xl border border-line bg-surface shadow-hairline">
        <DivideIcon className="size-5 text-ink-2" />
      </div>
      <p className="text-sm font-medium text-ink">Ask the assistant</p>
      <p className="max-w-52 text-xs leading-relaxed text-ink-2">
        Plan your site, write copy, search the web, and generate what you need.
      </p>
    </div>
  );
}

export function ChatPanel({
  projectId,
  conversationId,
  messages,
  onConversationCreated,
  onActiveConversationChange,
}: {
  projectId: string;
  conversationId: bigint | null;
  messages: ChatMessage[];
  onConversationCreated: (conversation: ConversationItem) => void;
  onActiveConversationChange: (id: bigint) => void;
}) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const conversationIdRef = useRef(conversationId);
  const turnRef = useRef<{ convId: bigint } | null>(null);
  const generationRef = useRef(0);
  const sendGenRef = useRef(-1);
  const lastRelayAtRef = useRef(0);
  const lastProgressAtRef = useRef(Date.now());
  const lastProgressKeyRef = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);

  conversationIdRef.current = conversationId;

  const setSendingState = useCallback((value: boolean) => {
    sendingRef.current = value;
    setSending(value);
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const relayStream = useCallback(
    (
      messageId: string,
      role: string,
      parts: UIMessage["parts"],
      status: string,
      force = false,
    ) => {
      const convId = turnRef.current?.convId ?? null;
      if (!convId) return;
      const now = Date.now();
      if (!force && now - lastRelayAtRef.current < STREAM_RELAY_INTERVAL_MS) {
        return;
      }
      lastRelayAtRef.current = now;
      socket.emit("conversation:stream", {
        projectId,
        conversationId: String(convId),
        messageId,
        role,
        parts,
        status,
      });
    },
    [projectId],
  );

  const chat = useChat<UIMessage>({
    transport: chatTransport,
    onFinish: async ({ message, isAbort }) => {
      const current = sendGenRef.current === generationRef.current;
      if (!current) return;
      const convId = turnRef.current?.convId ?? null;
      try {
        if (!isAbort && convId) {
          const content = textFromParts(message.parts).trim();
          if (content) {
            await sendAssistantMessageToConversation(
              convId,
              content,
              message.parts,
            );
          } else {
            relayStream(message.id, message.role, message.parts, "error", true);
          }
        } else {
          relayStream(message.id, message.role, message.parts, "error", true);
        }
        if (convId) {
          useMessagesStore.getState().pruneStreams(convId);
        }
      } catch (error) {
        console.error("[ChatPanel] failed to persist assistant message:", error);
        relayStream(message.id, message.role, message.parts, "error", true);
      } finally {
        turnRef.current = null;
        setSendingState(false);
      }
    },
    onError: (error) => {
      console.error("[ChatPanel] stream error:", error);
      const messages = chat.messages;
      const last = messages[messages.length - 1];
      if (last?.role === "assistant" && last.id) {
        relayStream(last.id, last.role, last.parts, "error", true);
      }
      const convId = turnRef.current?.convId ?? null;
      if (convId) {
        useMessagesStore.getState().pruneStreams(convId);
      }
      turnRef.current = null;
      setSendingState(false);
    },
  });
  const { messages: liveMessages, status, setMessages, sendMessage, stop } =
    chat;

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    conversationIdRef.current = conversationId;
    if (!sendingRef.current) {
      turnRef.current = null;
      sendGenRef.current = -1;
      generationRef.current += 1;
      setMessages([]);
      setSendingState(false);
    }
  }, [conversationId, setMessages, setSendingState]);

  useEffect(() => {
    const currentStreaming = busy;
    const last = liveMessages[liveMessages.length - 1];
    const turn = turnRef.current;
    if (!turn || turn.convId !== conversationId) return;
    if (!last || last.role !== "assistant") return;
    if (!currentStreaming) return;

    useMessagesStore.getState().upsertStreamMessage(turn.convId, {
      messageId: last.id,
      conversationId: turn.convId,
      projectId: BigInt(projectId),
      role: last.role,
      parts: last.parts,
      status: "streaming",
    });

    relayStream(last.id, last.role, last.parts, "streaming");
  }, [busy, conversationId, liveMessages, projectId, relayStream]);

  // Track the last time the stream actually produced new parts, so the
  // watchdog below can tell "still thinking" apart from "stalled forever".
  useEffect(() => {
    if (!busy) return;
    const last = liveMessages[liveMessages.length - 1];
    const key = last ? JSON.stringify(last.parts) : "";
    if (key !== lastProgressKeyRef.current) {
      lastProgressKeyRef.current = key;
      lastProgressAtRef.current = Date.now();
    }
  }, [busy, liveMessages]);

  // Watchdog: if the stream stays busy but stops producing new parts for too
  // long (a hung model/tool call the backend failed to time out), abort it and
  // surface an error instead of freezing on "Working…" forever.
  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => {
      if (Date.now() - lastProgressAtRef.current < STALL_TIMEOUT_MS) return;
      window.clearInterval(timer);
      console.error("[ChatPanel] stream stalled — aborting");
      stop();
      const last = liveMessages[liveMessages.length - 1];
      if (last?.role === "assistant" && last.id) {
        relayStream(last.id, last.role, last.parts, "error", true);
      }
      const convId = turnRef.current?.convId ?? null;
      if (convId) {
        useMessagesStore.getState().pruneStreams(convId);
      }
      turnRef.current = null;
      setSendingState(false);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [busy, liveMessages, relayStream, setSendingState, stop]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const handleSend = useCallback(
    (payload: { text: string; files?: File[] }) => {
      const content = payload.text.trim();
      if (!content || sendingRef.current) return;

      setSendingState(true);
      sendGenRef.current = generationRef.current;
      lastProgressAtRef.current = Date.now();
      lastProgressKeyRef.current = "";

      void (async () => {
        try {
          let convId = conversationIdRef.current;
          if (!convId) {
            const result = await sendFirstMessage(projectId, content);
            const conv = result?.conversation;
            if (!conv?.id) throw new Error("Failed to create conversation");
            convId = BigInt(conv.id);
            conversationIdRef.current = convId;
            onConversationCreated({
              id: String(convId),
              title: conv.title ?? null,
            });
            onActiveConversationChange(convId);
          } else {
            await sendMessageToConversation(convId, content);
          }

          turnRef.current = { convId };
          sendGenRef.current = generationRef.current;

          setMessages([]);
          void sendMessage(
            { text: content },
            { body: { conversationId: String(convId), message: content } },
          );
        } catch (error) {
          console.error("[ChatPanel] failed to persist user message:", error);
          setSendingState(false);
        }
      })();
    },
    [
      onActiveConversationChange,
      onConversationCreated,
      projectId,
      sendMessage,
      setMessages,
      setSendingState,
    ],
  );

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length > 0 ? (
          messages.map((message) =>
            isStreamMessage(message) ? (
              <StreamMessageView
                key={message.messageId}
                message={message}
              />
            ) : (
              <StoredMessageView
                key={String(message.id)}
                message={message}
              />
            ),
          )
        ) : (
          <EmptyState />
        )}
      </div>
      <div className="shrink-0 px-3 pb-3 pt-1">
        <ChatComposer
          variant="Rounded"
          value={input}
          onChange={setInput}
          onSend={handleSend}
          sending={sending}
        />
      </div>
    </div>
  );
}