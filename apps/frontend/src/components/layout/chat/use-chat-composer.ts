"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";

import { MENTION_FILES } from "./mention-files";
import type { ChatAttachment } from "./types";

function createAttachment(file: File): ChatAttachment {
  const isImage = file.type.startsWith("image/");

  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    file,
    type: isImage ? "image" : "file",
    previewUrl: isImage ? URL.createObjectURL(file) : undefined,
  };
}

export function useChatComposer({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);

  const mentionResults = MENTION_FILES.filter((file) => {
    const query = mentionQuery.trim().toLowerCase();
    if (!query) return true;

    return (
      file.label.toLowerCase().includes(query) ||
      file.path.toLowerCase().includes(query)
    );
  }).slice(0, 6);

  const canSend = value.trim().length > 0 || attachments.length > 0;

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";
    const height = Math.min(el.scrollHeight, 220);
    el.style.height = `${height}px`;
    el.style.overflowY = height >= 220 ? "auto" : "hidden";
  }, []);

  useLayoutEffect(() => {
    resizeTextarea();
  }, [value, attachments.length, resizeTextarea]);

  const focusComposer = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const next = Array.from(files).map(createAttachment);
    if (next.length === 0) return;

    setAttachments((current) => {
      const existing = new Set(current.map((item) => item.id));
      return [...current, ...next.filter((item) => !existing.has(item.id))];
    });
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return current.filter((item) => item.id !== id);
    });
  }, []);

  const clearComposer = useCallback(() => {
    setAttachments((current) => {
      current.forEach((attachment) => {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      });

      return [];
    });

    onChange("");
    setMentionOpen(false);
    setMentionQuery("");
  }, [onChange]);

  const syncMentionState = useCallback(
    (nextValue: string, cursor: number) => {
      const textBefore = nextValue.slice(0, cursor);
      const match = textBefore.match(/@([\w./-]*)$/);

      if (!match) {
        setMentionOpen(false);
        setMentionQuery("");
        setMentionIndex(0);
        return;
      }

      setMentionOpen(true);
      setMentionQuery(match[1] ?? "");
      setMentionIndex(0);
    },
    []
  );

  const handleValueChange = useCallback(
    (nextValue: string) => {
      onChange(nextValue);

      const cursor =
        textareaRef.current?.selectionStart ?? nextValue.length;
      syncMentionState(nextValue, cursor);
    },
    [onChange, syncMentionState]
  );

  const insertMention = useCallback(
    (path: string) => {
      const el = textareaRef.current;
      if (!el) return;

      const cursor = el.selectionStart;
      const textBefore = value.slice(0, cursor);
      const textAfter = value.slice(cursor);
      const atIndex = textBefore.lastIndexOf("@");

      if (atIndex === -1) return;

      const nextValue = `${value.slice(0, atIndex)}@${path} ${textAfter}`;
      onChange(nextValue);
      setMentionOpen(false);
      setMentionQuery("");
      setMentionIndex(0);

      requestAnimationFrame(() => {
        const nextCursor = atIndex + path.length + 2;
        el.focus();
        el.setSelectionRange(nextCursor, nextCursor);
      });
    },
    [onChange, value]
  );

  const handleComposerMouseDown = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      const target = event.target as HTMLElement;

      if (target.closest("textarea") || target.closest("[data-composer-control]")) {
        return;
      }

      event.preventDefault();
      focusComposer();
    },
    [focusComposer]
  );

  const handleComposerClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      const target = event.target as HTMLElement;

      if (target.closest("textarea") || target.closest("[data-composer-control]")) {
        return;
      }

      focusComposer();
    },
    [focusComposer]
  );

  const handleDragEnter = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragCounterRef.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragCounterRef.current -= 1;

    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);

      if (event.dataTransfer.files?.length) {
        addFiles(event.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!mentionOpen || mentionResults.length === 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMentionIndex((index) => (index + 1) % mentionResults.length);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setMentionIndex(
          (index) => (index - 1 + mentionResults.length) % mentionResults.length
        );
        return;
      }

      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        insertMention(mentionResults[mentionIndex]?.path ?? "");
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setMentionOpen(false);
      }
    },
    [insertMention, mentionIndex, mentionOpen, mentionResults]
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    textareaRef,
    fileInputRef,
    attachments,
    menuOpen,
    setMenuOpen,
    isDragging,
    mentionOpen,
    mentionResults,
    mentionIndex,
    setMentionIndex,
    canSend,
    focusComposer,
    addFiles,
    removeAttachment,
    clearComposer,
    handleValueChange,
    insertMention,
    handleComposerMouseDown,
    handleComposerClick,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleKeyDown,
    openFilePicker,
    resizeTextarea,
  };
}
