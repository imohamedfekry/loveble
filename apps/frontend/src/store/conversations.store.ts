import { create } from "zustand";

export interface ConversationItem {
  id: string;
  title: string;
}

interface ConversationsStore {
  conversations: ConversationItem[];
  setConversations: (conversations: ConversationItem[]) => void;
  addConversation: (conversation: ConversationItem) => void;
  updateConversation: (id: string, title: string) => void;
  removeConversation: (id: string) => void;
  bumpConversation: (id: string) => void;
}

export const useConversationsStore = create<ConversationsStore>((set) => ({
  conversations: [],

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [
        conversation,
        ...state.conversations.filter((c) => c.id !== conversation.id),
      ],
    })),

  updateConversation: (id, title) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, title } : c,
      ),
    })),

  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
    })),

  // A new message makes this conversation the most recently active one.
  bumpConversation: (id) =>
    set((state) => {
      const index = state.conversations.findIndex((c) => c.id === id);
      if (index <= 0) return {};

      const conversations = [...state.conversations];
      const [item] = conversations.splice(index, 1);
      return { conversations: [item, ...conversations] };
    }),
}));
