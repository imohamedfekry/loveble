"use client";

import { ArrowUp, ChevronDown, ImagePlus, Mic, Paperclip, Plus } from "lucide-react";
import { FaGithub } from "react-icons/fa";

import { cn } from "@/lib/utils";

import { ChatAttachmentPreview } from "./ChatAttachmentPreview";
import { ChatMentionMenu } from "./ChatMentionMenu";
import { useChatComposer } from "./use-chat-composer";

export function ChatBox({
  value,
  onChange,
  onOpenImport,
  onSend,
}: {
  value: string;
  onChange: (value: string) => void;
  onOpenImport: () => void;
  onSend?: (payload: { text: string; files: File[] }) => void;
}) {
  const {
    fileInputRef,
    textareaRef,
    attachments,
    menuOpen,
    setMenuOpen,
    isDragging,
    mentionOpen,
    mentionResults,
    mentionIndex,
    setMentionIndex,
    canSend,
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
  } = useChatComposer({ value, onChange });

  const openImport = () => {
    setMenuOpen(false);
    onOpenImport();
  };

  const handleSend = () => {
    if (!canSend) return;

    onSend?.({
      text: value.trim(),
      files: attachments.map((item) => item.file),
    });

    clearComposer();
  };

  return (
    <div className="animated-gradient-border rounded-3xl p-[1.5px]">
      <div
        className={cn(
          "relative cursor-text rounded-[22px] bg-[#141419] p-4",
          "transition-[box-shadow,background-color] duration-(--duration-quick) ease-out",
          isDragging &&
            "bg-[#17171f] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
        )}
        onMouseDown={handleComposerMouseDown}
        onClick={handleComposerClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div
            className={cn(
              "pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-2xl",
              "border border-dashed border-white/20 bg-white/[0.03]",
              "text-sm text-neutral-300"
            )}
          >
            Drop files or images here
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.md,.json,.ts,.tsx,.js,.jsx,.css,.html,.svg"
          className="hidden"
          data-composer-control
          onChange={(event) => {
            if (event.target.files) {
              addFiles(event.target.files);
            }

            event.target.value = "";
          }}
        />

        <ChatAttachmentPreview
          attachments={attachments}
          onRemove={removeAttachment}
        />

        <div className="relative">
          <ChatMentionMenu
            open={mentionOpen}
            items={mentionResults}
            activeIndex={mentionIndex}
            onHover={setMentionIndex}
            onSelect={insertMention}
          />

          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(event) => handleValueChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                if (mentionOpen) return;

                event.preventDefault();
                handleSend();
                return;
              }

              handleKeyDown(event);
            }}
            placeholder="Ask loveble to build a prototype… (@ to mention a file)"
            className={cn(
              "block min-h-14 w-full resize-none bg-transparent outline-none",
              "text-[17px] leading-7 text-neutral-100 caret-primary",
              "placeholder:text-neutral-500",
              "max-h-55 overflow-hidden"
            )}
          />
        </div>

        <div className="mt-1 flex items-center justify-between gap-2 pt-2">
          <div className="relative shrink-0">
            <button
              type="button"
              data-composer-control
              aria-expanded={menuOpen}
              aria-label="Add attachment"
              onClick={() => setMenuOpen((open) => !open)}
              className={cn(
                "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full",
                "border border-neutral-700/90 bg-neutral-900 text-neutral-300",
                "transition-[background-color,border-color,transform] duration-(--duration-fast) ease-out",
                "hover:border-neutral-600 hover:bg-neutral-800 active:scale-[0.96]"
              )}
            >
              <Plus className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div
                data-composer-control
                className={cn(
                  "absolute bottom-11 left-0 z-20 w-56 overflow-hidden rounded-xl",
                  "border border-neutral-800 bg-[#1a1a20] shadow-xl shadow-black/40",
                  "animate-in fade-in-0 slide-in-from-bottom-1 duration-(--duration-quick) ease-out"
                )}
              >
                <button
                  type="button"
                  data-composer-control
                  onClick={openImport}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-sm text-neutral-200",
                    "transition-[background-color,color] duration-(--duration-fast) ease-out",
                    "hover:bg-neutral-800"
                  )}
                >
                  <FaGithub className="h-4 w-4" />
                  Import from GitHub
                </button>

                <button
                  type="button"
                  data-composer-control
                  onClick={() => {
                    setMenuOpen(false);
                    openFilePicker();
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-sm text-neutral-200",
                    "transition-[background-color,color] duration-(--duration-fast) ease-out",
                    "hover:bg-neutral-800"
                  )}
                >
                  <Paperclip className="h-4 w-4" />
                  Upload file
                </button>

                <button
                  type="button"
                  data-composer-control
                  onClick={() => {
                    setMenuOpen(false);
                    openFilePicker();
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-sm text-neutral-200",
                    "transition-[background-color,color] duration-(--duration-fast) ease-out",
                    "hover:bg-neutral-800"
                  )}
                >
                  <ImagePlus className="h-4 w-4" />
                  Upload image
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-composer-control
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-neutral-300",
                "transition-[background-color,color] duration-(--duration-fast) ease-out",
                "hover:bg-neutral-800 hover:text-neutral-100"
              )}
            >
              Build
              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-(--duration-fast) ease-in-out" />
            </button>

            <button
              type="button"
              data-composer-control
              aria-label="Voice input"
              className={cn(
                "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-neutral-300",
                "transition-[background-color,transform] duration-(--duration-fast) ease-out",
                "hover:bg-neutral-800 hover:text-neutral-100 active:scale-[0.96]"
              )}
            >
              <Mic className="h-4 w-4" />
            </button>

            {canSend && (
              <button
                type="button"
                data-composer-control
                aria-label="Send message"
                onClick={handleSend}
                className={cn(
                  "flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-white text-neutral-900",
                  "animate-in fade-in-80 zoom-in-75 slide-in-from-right-3 fill-mode-forwards",
                  "duration-(--duration-fast) ease-out",
                  "transition-[background-color,transform] hover:bg-neutral-200 active:scale-90"
                )}
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
