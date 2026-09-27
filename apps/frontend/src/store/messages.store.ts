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
}

interface MessagesStore {
  messagesByConversation: Map<bigint, Message[]>;
  addMessage: (conversationId: bigint, message: Message) => void;
  setMessages: (conversationId: bigint, messages: Message[]) => void;
  updateMessage: (conversationId: bigint, message: Message) => void;
  removeMessage: (conversationId: bigint, messageId: bigint) => void;
  getMessages: (conversationId: bigint) => Message[];
}

export const useMessagesStore = create<MessagesStore>((set, get) => ({
  messagesByConversation: new Map(),

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
}));
