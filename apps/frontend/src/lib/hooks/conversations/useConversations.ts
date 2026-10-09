"use client";

import { useCallback } from "react";
import { apiFetch } from "@/lib/api/api-fetch";
import { useMessagesStore } from "@/store/messages.store";
import type { ApiSuccess } from "@loveble/types/envelope";
import type { Message } from "@/store/messages.store";

const API_BASE = "/conversations";

async function apiRequest<T>(url: string, options?: RequestInit): Promise<ApiSuccess<T>> {
  return apiFetch<T>(url, options);
}

// The API serializes BigInt columns to strings; the realtime socket handler
// converts them back to BigInt. Normalize everything to BigInt so the
// messages Map keys, React comparisons and store lookups all match.
const toId = (value: bigint | string): bigint =>
  typeof value === "bigint" ? value : BigInt(value);

function normalizeMessage(raw: any): Message {
  return {
    ...raw,
    id: toId(raw.id),
    conversationId: toId(raw.conversationId),
    projectId: toId(raw.projectId),
  };
}

export const useConversations = (projectId: string | null) => {
  const getByProject = useCallback(async () => {
    const result = await apiRequest<{ conversations: any[] }>(
      `${API_BASE}/project/${projectId}`,
    );
    return result;
  }, [projectId]);

  const getById = useCallback(async (id: bigint) => {
    const result = await apiRequest<{ conversation: any }>(
      `${API_BASE}/${id}`,
    );
    return result;
  }, []);

  const updateConversation = useCallback(
    async (id: bigint, data: { title: string }) => {
      const result = await apiRequest<{ conversation: any }>(
        `${API_BASE}/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      return result;
    },
    [],
  );

  const deleteConversation = useCallback(async (id: bigint) => {
    await apiRequest(`${API_BASE}/${id}`, { method: "DELETE" });
  }, []);

  return { getByProject, getById, updateConversation, deleteConversation };
};

export const useMessages = (conversationId: bigint | string | null) => {
  const setMessages = useMessagesStore((s) => s.setMessages);
  const addMessage = useMessagesStore((s) => s.addMessage);
  const removeMessage = useMessagesStore((s) => s.removeMessage);

  const getMessages = useCallback(async () => {
    if (!conversationId) return;
    const cid = toId(conversationId);
    const result = await apiRequest<{ messages: any[] }>(
      `${API_BASE}/${cid}/messages`,
    );
    if (result?.data?.messages) {
      setMessages(cid, result.data.messages.map(normalizeMessage));
    }
    return result;
  }, [conversationId, setMessages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId) return;
      const cid = toId(conversationId);
      const result = await apiRequest<{ message: any }>(
        `${API_BASE}/${cid}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // JSON.stringify throws on BigInt — always send the id as a string.
          body: JSON.stringify({ conversationId: String(cid), content }),
        },
      );
      if (result?.data?.message) {
        addMessage(cid, normalizeMessage(result.data.message));
      }
      return result;
    },
    [conversationId, addMessage],
  );

  const updateMessage = useCallback(
    async (messageId: bigint, data: { status?: string; content?: string }) => {
      const result = await apiRequest<{ message: any }>(
        `${API_BASE}/messages/${messageId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      return result;
    },
    [],
  );

  const deleteMessage = useCallback(
    async (messageId: bigint | string) => {
      await apiRequest(`${API_BASE}/messages/${messageId}`, {
        method: "DELETE",
      });
      if (conversationId) {
        removeMessage(toId(conversationId), toId(messageId));
      }
    },
    [conversationId, removeMessage],
  );

  return { getMessages, sendMessage, updateMessage, deleteMessage };
};

export async function sendMessageToConversation(
  conversationId: bigint,
  content: string,
): Promise<Message | null> {
  const result = await apiRequest<{ message: any }>(
    `${API_BASE}/${conversationId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    },
  );
  const message = result?.data?.message;
  if (!message) return null;
  const normalized = normalizeMessage(message);
  useMessagesStore.getState().addMessage(conversationId, normalized);
  return normalized;
}

export async function sendFirstMessage(
  projectId: string | null,
  content: string,
): Promise<{ conversation: any; message: Message } | null> {
  const result = await apiRequest<{ conversation: any; message: any }>(
    `${API_BASE}/project/${projectId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    },
  );
  const conversation = result?.data?.conversation;
  const message = result?.data?.message;
  if (!conversation?.id || !message) return null;
  const normalized = normalizeMessage(message);
  useMessagesStore
    .getState()
    .addMessage(toId(conversation.id), normalized);
  return { conversation, message: normalized };
};
