"use client";

import { useEffect, useRef } from "react";
import {
  ArrowUp,
  ChevronDown,
  Mic,
  Plus,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { ComposerAttachments } from "./ComposerAttachments";
import { ComposerMenu } from "./ComposerMenu";
import { ComposerModelMenu } from "./ComposerModelMenu";
import { useChatComposer } from "./useChatComposer";
import type {
  ComposerModel,
  ComposerVariant,
} from "./types";

export function ChatComposer({
  variant = "Rounded",
  value,
  onChange,
  onSend,
}: {
  variant?: ComposerVariant;
  value: string;
  onChange: (value: string) => void;
  onSend?: (payload: {
    text: string;
    files: File[];
  }) => void;
}) {
  const pill = variant === "Pill";

  const {
    inputRef,
    controlsRef,
    measureRef,
    modelRef,

    plusOpen,
    setPlusOpen,

    modelOpen,
    setModelOpen,

    model,
    selectModel,

    attachments,
    addFiles,
    removeAttachment,

    connected,
    setConnected,

    active,
    setActive,

    modelHovered,
    setModelHovered,

    expanded,

    rowBox,
    modelBox,

    listening,
    startDictation,

    engaged,
    setEngaged,

    menu,
    rows,

    canSend,

    handleChange,
    handleKeyDown,

    openPlusMenu,
    pick,
    send,
  } = useChatComposer({
    value,
    onChange,
    onSend,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!plusOpen && !modelOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (
        composerRef.current &&
        !composerRef.current.contains(
          event.target as Node,
        )
      ) {
        setPlusOpen(false);
        setModelOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);

    return () =>
      document.removeEventListener(
        "pointerdown",
        onPointerDown,
      );
  }, [plusOpen, modelOpen, setModelOpen, setPlusOpen]);

  useEffect(() => {
    if (!listening) return;

    const timer = window.setTimeout(() => {
      onChange(
        value
          ? `${value.trimEnd()} Compare pistachio weekends to last summer`
          : "Compare pistachio weekends to last summer"
      );

      startDictation();
      inputRef.current?.focus();
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [
    inputRef,
    listening,
    onChange,
    startDictation,
    value,
  ]);

  const handlePick = (row: {
    key: string;
    name: string;
    desc: string;
  }) => {
    if (row.key === "attach") {
      fileInputRef.current?.click();
      setPlusOpen(false);
      return;
    }

    pick(row);
  };

  const handleModelSelect = (next: ComposerModel) => {
    selectModel(next);
  };

  return (
    <div
      ref={composerRef}
      className="w-[95%] m-auto"
    >
      <div className="relative">
        <ComposerMenu
          menu={menu}
          rows={rows}
          active={active}
          engaged={engaged}
          connected={connected}
          rowBox={rowBox}
          onHover={(index) => {
            setActive(index);
            setEngaged(true);
          }}
          onClick={handlePick}
          onConnect={() =>
            setConnected((current) => !current)
          }
          onMouseLeave={() => setEngaged(false)}
        />

        <ComposerModelMenu
          open={modelOpen}
          selected={model}
          hovered={modelHovered}
          modelBox={modelBox}
          onHover={setModelHovered}
          onSelect={handleModelSelect}
          onMouseLeave={() => setModelHovered(null)}
        />

        <div
          className={cn(
            "relative isolate flex flex-col gap-1.5 overflow-hidden",
            "border border-border bg-card",
            "p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.18)]",
            "transition-[border-color,border-radius] duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none",
            "focus-within:border-ring",
            pill
              ? attachments.length > 0 || expanded
                ? "rounded-3xl"
                : "rounded-full"
              : "rounded-[22px]"
          )}
        >
          <ComposerAttachments
            attachments={attachments}
            variant={variant}
            onRemove={removeAttachment}
          />

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.md,.json,.ts,.tsx,.js,.jsx,.css,.html,.svg"
            className="hidden"
            onChange={(event) => {
              if (event.target.files) {
                addFiles(event.target.files);
              }

              event.target.value = "";
            }}
          />

          <span
            ref={measureRef}
            aria-hidden
            className="pointer-events-none absolute invisible whitespace-pre text-[13px] leading-4.5"
          >
            {value}
          </span>

          <div
            ref={controlsRef}
            className={cn(
              "grid items-end gap-x-1 gap-y-1.5 p-2",
              expanded
                ? "grid-cols-[minmax(0,1fr)_auto_28px_28px]"
                : "grid-cols-[28px_minmax(0,1fr)_auto_28px_28px]"
            )}
          >


            {/* INPUT */}
            <textarea
              ref={inputRef}
              rows={1}
              value={value}
              onChange={(event) =>
                handleChange(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder={
                listening
                  ? "Listening…"
                  : "Write a message…"
              }
              aria-label="Prompt"
              className={cn(
                "min-h-20 min-w-0 w-full resize-none",
                "bg-transparent px-1 py-1.25",
                "text-[15px] leading-[20px] text-foreground",
                "outline-none [overflow-wrap:anywhere]",
                "placeholder:text-muted-foreground",
                  "col-span-full col-start-1 row-start-1  "
                   
              )}
            />

                        {/* PLUS */}
            <button
              type="button"
              aria-label="Add attachments and sources"
              aria-expanded={plusOpen}
              onClick={openPlusMenu}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center",
                "text-muted-foreground transition-[background-color,color,scale] duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none",
                "hover:bg-foreground/5 hover:text-foreground",
                "active:scale-[0.94]",
                pill ? "rounded-full" : "rounded-lg",
                plusOpen &&
                  "bg-foreground/5 text-foreground",
                expanded
                  ? "col-start-1 row-start-2"
                  : "col-start-1 row-start-1"
              )}
            >
              <Plus className="h-4 w-4" />
            </button>

            {/* MODEL */}
            <button
              ref={modelRef}
              type="button"
              aria-expanded={modelOpen}
              aria-label="Choose model"
              onClick={() => {
                setPlusOpen(false);
                setModelOpen(
                  (current) => !current
                );
              }}
              className={cn(
                "flex h-7 shrink-0 items-center gap-1",
                "px-1.5 text-xs font-medium",
                "text-muted-foreground transition-[background-color,color] duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none",
                "hover:bg-foreground/5 hover:text-foreground",
                pill ? "rounded-full" : "rounded-lg",
                expanded
                  ? "col-start-2 row-start-2"
                  : "col-start-3 row-start-1"
              )}
            >
              {model.name}

              <ChevronDown
                className={cn(
                  "h-3 w-3 text-muted-foreground transition-[rotate] duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none",
                  modelOpen && "rotate-180"
                )}
              />
            </button>

            {/* MIC */}
            <button
              type="button"
              aria-label={
                listening
                  ? "Stop dictation"
                  : "Start dictation"
              }
              aria-pressed={listening}
              onClick={startDictation}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center",
                "transition-[background-color,color,scale] duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none",
                "active:scale-[0.94]",
                pill ? "rounded-full" : "rounded-lg",
                listening
                  ? "bg-foreground/[0.08] text-foreground"
                  : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                expanded
                  ? "col-start-3 row-start-2"
                  : "col-start-4 row-start-1"
              )}
            >
              {listening ? (
                <span className="flex h-3.5 items-center gap-0.5">
                  {[0, 1, 2].map((index) => (
                    <span
                      key={index}
                      className="w-0.5 rounded-full bg-current"
                      style={{
                        height: "100%",
                        animation: `eq-bounce 900ms ease-in-out ${
                          index * 150
                        }ms infinite`,
                      }}
                    />
                  ))}
                </span>
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>

            {/* SEND */}
            <button
              type="button"
              aria-label="Send"
              disabled={!canSend}
              onClick={send}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center",
                "transition-[background-color,color,scale] duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none",
                "enabled:active:scale-[0.94]",
                pill ? "rounded-full" : "rounded-lg",
                expanded
                  ? "col-start-4 row-start-2"
                  : "col-start-5 row-start-1",
                canSend
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}