"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@loveble/ui/dialog";
import { Button } from "@loveble/ui/button";
import { Textarea } from "@loveble/ui/textarea";
import { BrainIcon, Loader2Icon } from "lucide-react";
import { socket } from "@/lib/socket/socket";
import {
  clearConversationMemory,
  getConversationMemory,
  updateConversationMemory,
} from "@/lib/hooks/conversations/useConversations";

const MAX_LENGTH = 20000;

const PLACEHOLDER = `# Conversation Memory

## Current Task

## Key Facts

## Decisions

## Open Questions`;

/**
 * Read / edit / clear the agent's thread-scoped working memory for the active
 * conversation. The agent maintains this scratchpad itself; this panel lets the
 * user inspect what it "remembers" and correct or wipe it.
 */
export function MemoryPanel({
  conversationId,
}: {
  conversationId: bigint | null;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  // Last server-known value; Reset reverts edits back to it.
  const [baseline, setBaseline] = useState("");
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  useEffect(() => {
    if (!open || !conversationId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getConversationMemory(conversationId)
      .then((res) => {
        if (cancelled) return;
        const loaded = res.data?.workingMemory ?? "";
        setValue(loaded);
        setBaseline(loaded);
        setDirty(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load memory");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, conversationId]);

  // Live updates while the agent works. Skip when the user has unsaved edits so
  // we never clobber what they are typing.
  useEffect(() => {
    if (!open || !conversationId) return;
    const onMemoryUpdated = (payload: {
      conversationId?: string;
      workingMemory?: string;
    }) => {
      if (payload?.conversationId !== String(conversationId)) return;
      if (dirtyRef.current) return;
      const next = payload.workingMemory ?? "";
      setValue(next);
      setBaseline(next);
      setDirty(false);
    };
    socket.on("memory:updated", onMemoryUpdated);
    return () => {
      socket.off("memory:updated", onMemoryUpdated);
    };
  }, [open, conversationId]);

  const handleSave = useCallback(async () => {
    if (!conversationId) return;
    setSaving(true);
    setError(null);
    try {
      await updateConversationMemory(conversationId, value);
      setBaseline(value);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save memory");
    } finally {
      setSaving(false);
    }
  }, [conversationId, value]);

  const handleReset = useCallback(() => {
    setValue(baseline);
    setDirty(false);
    setError(null);
  }, [baseline]);

  const handleClear = useCallback(async () => {
    if (!conversationId) return;
    if (!window.confirm("Clear this conversation's memory? This cannot be undone.")) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await clearConversationMemory(conversationId);
      setValue("");
      setBaseline("");
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear memory");
    } finally {
      setSaving(false);
    }
  }, [conversationId]);

  const busy = loading || saving;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        disabled={!conversationId}
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-ink-2 hover:text-ink"
          />
        }
      >
        <BrainIcon />
        Memory
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl gap-3 border border-line bg-surface sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainIcon className="size-4" />
            Conversation memory
          </DialogTitle>
          <DialogDescription className="text-ink-2">
            What the agent remembers for this conversation. Edit or clear it —
            it never carries over to other conversations.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-ink-3">
            <Loader2Icon className="size-5 animate-spin" />
          </div>
        ) : (
          <Textarea
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setDirty(true);
            }}
            disabled={saving}
            maxLength={MAX_LENGTH}
            placeholder={PLACEHOLDER}
            spellCheck={false}
            className="min-h-64 max-h-[45vh] resize-y font-mono text-[12.5px] leading-relaxed"
          />
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <DialogFooter showCloseButton={false}>
          <span className="me-auto self-center font-mono text-[11px] text-ink-3 tabular-nums">
            {value.length}/{MAX_LENGTH}
          </span>
          {dirty ? (
            <>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={saving}
              >
                Reset
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2Icon className="animate-spin" />}
                Save
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="destructive"
                onClick={handleClear}
                disabled={busy || value.length === 0}
              >
                Clear
              </Button>
              <DialogClose render={<Button variant="outline" />}>
                Close
              </DialogClose>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
