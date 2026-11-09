"use client";

import { useEffect, useState } from "react";

import type { ConversationPlan } from "@/lib/plan";
import { getConversationPlan } from "./useConversations";

type PlanState = { conversation: bigint | null; plan: ConversationPlan | null };

/**
 * The conversation's saved plan, read from the server. `refreshKey` bumps when a
 * turn finishes, so the panel reconciles with what the agent actually persisted
 * (the streamed tool input is only a preview of it).
 */
export function useConversationPlan(
  conversationId: bigint | null,
  refreshKey: number,
) {
  const [state, setState] = useState<PlanState>({
    conversation: null,
    plan: null,
  });

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;

    getConversationPlan(conversationId)
      .then((result) => {
        if (cancelled) return;
        setState({ conversation: conversationId, plan: result?.data?.plan ?? null });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [conversationId, refreshKey]);

  // Never show the previous conversation's plan while the new one loads.
  return state.conversation === conversationId ? state.plan : null;
}
