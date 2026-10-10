import { create } from "zustand";

export interface Message {
  id: bigint;
  conversationId: bigint;
  projectId: bigint;
  content: string;
  role: "user" | "assistant" | "system";
  status: string;
  updatedAt: string;
  createdAt: string;
  parts?: unknown[];
}

export interface StreamMessage {
  messageId: string;
  conversationId: bigint;
  projectId: bigint;
  role: "user" | "assistant" | "system";
  parts: unknown[];
  status: string;
}

export type ChatMessage = Message | StreamMessage;

export function isStreamMessage(message: ChatMessage): message is StreamMessage {
  return "messageId" in message;
}

interface MessagesStore {
  messagesByConversation: Map<bigint, Message[]>;
  streamsByConversation: Map<bigint, Map<string, StreamMessage>>;
  addMessage: (conversationId: bigint, message: Message) => void;
  setMessages: (conversationId: bigint, messages: Message[]) => void;
  updateMessage: (conversationId: bigint, message: Message) => void;
  removeMessage: (conversationId: bigint, messageId: bigint) => void;
  getMessages: (conversationId: bigint) => Message[];
  upsertStreamMessage: (conversationId: bigint, message: StreamMessage) => void;
  pruneStreams: (conversationId: bigint) => void;
  getConversationMessages: (conversationId: bigint) => ChatMessage[];
}

export const useMessagesStore = create<MessagesStore>((set, get) => ({
  messagesByConversation: new Map(),
  streamsByConversation: new Map(),

  addMessage: (conversationId, message) =>
    set((state) => {
      const map = new Map(state.messagesByConversation);
      const existing = map.get(conversationId) ?? [];
      // Dedupe: the HTTP response and the realtime `message:new` echo can
      // both deliver the same message.
      if (existing.some((m) => m.id === message.id)) return {};
      map.set(conversationId, [...existing, message]);
      return { messagesByConversation: map };
    }),

  setMessages: (conversationId, messages) =>
    set((state) => {
      const map = new Map(state.messagesByConversation);
      map.set(conversationId, messages);
      return { messagesByConversation: map };
    }),

  updateMessage: (conversationId, updatedMessage) =>
    set((state) => {
      const map = new Map(state.messagesByConversation);
      const existing = map.get(conversationId) ?? [];
      const index = existing.findIndex((m) => m.id === updatedMessage.id);
      if (index >= 0) {
        const updated = [...existing];
        updated[index] = updatedMessage;
        map.set(conversationId, updated);
      }
      return { messagesByConversation: map };
    }),

  removeMessage: (conversationId, messageId) =>
    set((state) => {
      const map = new Map(state.messagesByConversation);
      const existing = map.get(conversationId) ?? [];
      map.set(
        conversationId,
        existing.filter((m) => m.id !== messageId),
      );
      return { messagesByConversation: map };
    }),

  getMessages: (conversationId) =>
    get().messagesByConversation.get(conversationId) ?? [],

  upsertStreamMessage: (conversationId, message) =>
    set((state) => {
      const map = new Map(state.streamsByConversation);
      const inner = new Map(map.get(conversationId) ?? []);
      inner.set(message.messageId, message);
      map.set(conversationId, inner);
      return { streamsByConversation: map };
    }),

  pruneStreams: (conversationId) =>
    set((state) => {
      const map = new Map(state.streamsByConversation);
      map.set(conversationId, new Map());
      return { streamsByConversation: map };
    }),

  getConversationMessages: (conversationId) => {
    const active =
      get().messagesByConversation.get(conversationId) ?? [];
    const streams = get().streamsByConversation.get(conversationId);
    if (!streams || streams.size === 0) return active;
    return [...active, ...streams.values()];
  },
}));
