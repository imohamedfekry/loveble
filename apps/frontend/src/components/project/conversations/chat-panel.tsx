"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { DivideIcon, SparklesIcon } from "lucide-react";
import { LoadingState, StreamText } from "@/components/beautiful-ui";
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
  stopConversationGeneration,
} from "@/lib/hooks/conversations/useConversations";
import {
  useMessagesStore,
  isStreamMessage,
  type ChatMessage,
  type Message,
  type StreamMessage,
} from "@/store/messages.store";
import { useChatContextStore } from "@/store/chat-context.store";
import { useFilesStore } from "@/store/file.store";
import { fileIdByPath, formatMentions } from "@/lib/chat-context";
import { useEditor } from "@/lib/hooks/use-editor";
import type { ConversationItem } from "@/store/conversations.store";
import { UserMessage } from "./messages/user-message";
import { MemoryPanel } from "./memory-panel";
import { TeamRunMonitor } from "./team-run-monitor";

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

/** The heart-pixel loader used wherever the agent is thinking. */
function Thinking({ label = "Thinking" }: { label?: string }) {
  return <LoadingState variant="Heart" label={label} />;
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
      className="wrap-anywhere [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_pre]:my-2 [&_code]:font-mono"
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
  projectId,
  onQuickReply,
}: {
  parts: UIMessage["parts"];
  loading: boolean;
  projectId: string;
  onQuickReply?: (text: string) => void;
}) {
  const tools = toolPartsFromParts(parts);
  const reasoning = reasoningFromParts(parts);
  const reasoningStreaming = reasoningIsStreaming(parts, loading);
  const content = textFromParts(parts);
  const showThinking = loading && !content && tools.length === 0;

  return (
    <AssistantShell>
      {tools.length > 0 && (
        <ToolCalls
          parts={tools}
          projectId={projectId}
          className="mb-2.5"
          onQuickReply={onQuickReply}
        />
      )}
      {reasoning && <ReasoningBlock text={reasoning} loading={reasoningStreaming} />}
      {showThinking ? (
        <span className="inline-flex items-center py-1">
          <Thinking />
        </span>
      ) : ( 
        <MarkdownText text={content} loading={loading} />
      )}
    </AssistantShell>
  );
}

function SystemMessageView({ message }: { message: Message }) {
  return (
    <div className="flex justify-center py-1.5">
      <span className="text-[11.5px] text-ink-2/80">
        {message.content || "…"}
      </span>
    </div>
  );
}

function StoredMessageView({
  message,
  projectId,
  onOpenPath,
  onQuickReply,
}: {
  message: Message;
  projectId: string;
  onOpenPath?: (path: string) => void;
  onQuickReply?: (text: string) => void;
}) {
  if (message.role === "user") {
    return <UserMessage message={message} onOpenPath={onOpenPath} />;
  }
  if (message.role === "system") {
    return <SystemMessageView message={message} />;
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
  return <AssistantReplyView parts={parts} loading={false} projectId={projectId} onQuickReply={onQuickReply} />;
}

function StreamMessageView({
  message,
  projectId,
  onQuickReply,
}: {
  message: StreamMessage;
  projectId: string;
  onQuickReply?: (text: string) => void;
}) {
  return (
    <AssistantReplyView
      parts={message.parts as UIMessage["parts"]}
      loading={message.status === "streaming"}
      projectId={projectId}
      onQuickReply={onQuickReply}
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
  const [mode, setMode] = useState<"plan" | "build">("build");
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

  const allMentions = useChatContextStore((s) => s.items);
  const mentions = useMemo(
    () => allMentions.filter((item) => item.projectId === projectId),
    [allMentions, projectId],
  );
  const removeMention = useCallback((id: string) => {
    useChatContextStore.getState().remove(id);
  }, []);

  const { openFile } = useEditor(projectId);

  const handleOpenMention = useCallback(
    (mention: (typeof mentions)[number]) => {
      if (mention.kind === "folder") return;
      openFile(mention.fileId, { pinned: true });
    },
    [openFile],
  );

  const handleOpenPath = useCallback(
    (path: string) => {
      const files =
        useFilesStore.getState().files[projectId] ?? [];
      const fileId = fileIdByPath(files, path);
      if (fileId) {
        openFile(fileId, { pinned: true });
      }
    },
    [openFile, projectId],
  );

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
        const content = textFromParts(message.parts).trim();
        if (!isAbort && convId) {
          if (content) {
            await sendAssistantMessageToConversation(
              convId,
              content,
              message.parts,
            );
          } else {
            relayStream(message.id, message.role, message.parts, "error", true);
          }
        } else if (isAbort && convId) {
          // User (or the watchdog) stopped the generation. Keep whatever was
          // produced so far and mark the stop in a single atomic request.
          await stopConversationGeneration(convId, content, message.parts);
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
      // An aborted fetch is expected whenever the user clicks "Stop" (or the
      // watchdog aborts a stalled stream). The `onFinish(isAbort)` handler owns
      // persistence for that case — don't double-handle it here.
      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error as { name?: string }).name === "AbortError"
      ) {
        return;
      }
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

  // A stream can be active on this conversation without any local useChat
  // request — the dashboard "create project from a prompt" flow runs the build
  // server-side in Inngest and relays it over realtime. That build is not
  // stoppable via useChat.stop(), so we surface the stop button and call the
  // backend endpoint, which aborts the in-flight build.
  const hasRemoteStream = messages.some(
    (message) => isStreamMessage(message) && message.status === "streaming",
  );
  const displaySending = sending || hasRemoteStream;

  // The dashboard "create project from a prompt" flow runs the build entirely
  // server-side before it streams anything back. Until the first assistant
  // message arrives the chat would otherwise look frozen on an empty pane, so
  // we surface the thinking loader. Bound it with a grace window so a build
  // that dies without persisting anything never spins forever.
  const lastMessage = messages[messages.length - 1];
  const lastIsUser = lastMessage?.role === "user";
  const noAssistantYet =
    messages.length > 0 &&
    !messages.some((message) => message.role === "assistant");
  const [pendingExpired, setPendingExpired] = useState(false);
  useEffect(() => {
    if (displaySending || !lastIsUser || !noAssistantYet) {
      setPendingExpired(false);
      return;
    }
    const timer = window.setTimeout(() => setPendingExpired(true), 180_000);
    return () => window.clearTimeout(timer);
  }, [displaySending, lastIsUser, noAssistantYet, conversationId]);
  const awaitingAssistant =
    displaySending || (lastIsUser && noAssistantYet && !pendingExpired);

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
    if (!turn || turn.convId !== conversationIdRef.current) return;
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
  }, [messages.length, awaitingAssistant, scrollToBottom]);

  const handleSend = useCallback(
    (payload: { text: string; files?: File[] }) => {
      const typed = payload.text.trim();
      const contextItems = useChatContextStore
        .getState()
        .items.filter((item) => item.projectId === projectId);
      if ((!typed && contextItems.length === 0) || sendingRef.current) return;

      setSendingState(true);
      sendGenRef.current = generationRef.current;
      lastProgressAtRef.current = Date.now();
      lastProgressKeyRef.current = "";

      void (async () => {
        try {
          const content = `${typed}${formatMentions(contextItems)}`.trim();
          if (!content) {
            setSendingState(false);
            return;
          }

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

          if (contextItems.length > 0) {
            useChatContextStore.getState().clearProject(projectId);
          }

          turnRef.current = { convId };
          sendGenRef.current = generationRef.current;

          setMessages([]);
          void sendMessage(
            { text: content },
            {
              body: {
                conversationId: String(convId),
                message: content,
                projectId,
                mode,
              },
            },
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
      mode,
      sendMessage,
      setMessages,
      setSendingState,
    ],
  );

  const handleStop = useCallback(() => {
    // Local useChat stream → abort the fetch (backend aborts the model on
    // disconnect, onFinish(isAbort) persists the partial).
    if (busy) {
      stop();
      return;
    }
    // Server-side build (dashboard first message): no fetch to abort, so ask
    // the backend to cancel the in-flight build and record the stop. Pass the
    // latest streamed parts (if any) so the model's partial output is kept.
    const convId = conversationIdRef.current;
    if (!convId) return;
    void (async () => {
      const stream = useMessagesStore
        .getState()
        .streamsByConversation.get(convId);
      const lastStreamMessage = stream && stream.size > 0
        ? [...stream.values()].at(-1)
        : undefined;
      const parts = lastStreamMessage?.parts ?? [];
      const content = textFromParts(
        (parts as UIMessage["parts"]).filter(
          (part) => part.type === "text",
        ),
      );
      try {
        await stopConversationGeneration(convId, content, parts);
      } catch (error) {
        console.error("[ChatPanel] failed to stop remote build:", error);
      } finally {
        useMessagesStore.getState().pruneStreams(convId);
        turnRef.current = null;
        setSendingState(false);
      }
    })();
  }, [busy, setSendingState, stop]);

  // Answering an `ask-user` card behaves like sending a message: the chosen
  // option (or typed answer) becomes the next user turn.
  const handleQuickReply = useCallback(
    (text: string) => {
      if (sendingRef.current) return;
      handleSend({ text });
    },
    [handleSend],
  );

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4 [scrollbar-gutter:stable]"
      >
        {messages.length > 0 ? (
          <>
            {messages.map((message) =>
              isStreamMessage(message) ? (
                <StreamMessageView
                  key={message.messageId}
                  message={message}
                  projectId={projectId}
                  onQuickReply={handleQuickReply}
                />
              ) : (
                <StoredMessageView
                  key={String(message.id)}
                  message={message}
                  projectId={projectId}
                  onOpenPath={handleOpenPath}
                  onQuickReply={handleQuickReply}
                />
              ),
            )}
            {awaitingAssistant && lastIsUser && (
              <AssistantShell>
                <Thinking />
              </AssistantShell>
            )}
          </>
        ) : displaySending ? (
          <AssistantShell>
            <Thinking label="Building" />
          </AssistantShell>
        ) : (
          <EmptyState />
        )}
      </div>
      <div className="shrink-0 px-3 pb-3 pt-1">
        <TeamRunMonitor projectId={projectId} />
        <div className="mb-1.5 flex items-center justify-between gap-2 pr-1">
          <MemoryPanel conversationId={conversationId} />
          <div
            role="tablist"
            aria-label="Agent mode"
            className="inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5 text-xs"
          >
            {(["plan", "build"] as const).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={mode === item}
                disabled={displaySending}
                onClick={() => setMode(item)}
                className={
                  "rounded-full px-2.5 py-1 font-medium capitalize transition-colors disabled:opacity-50 " +
                  (mode === item
                    ? "bg-primary text-primary-foreground"
                    : "text-ink-2 hover:text-ink")
                }
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <ChatComposer
          variant="Rounded"
          value={input}
          onChange={setInput}
          onSend={handleSend}
          onStop={handleStop}
          sending={displaySending}
          projectId={projectId}
          mentions={mentions}
          onRemoveMention={removeMention}
          onOpenMention={handleOpenMention}
        />
      </div>
    </div>
  );
}