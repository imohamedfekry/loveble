"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUp,
  ChevronDown,
  FilePlusCornerIcon,
  Layers2Icon,
  Mic,
  PaperclipIcon,
  Plus,
  ScrollIcon,
  Square,
  Upload,
  UsersIcon,
} from "lucide-react";

import { cn } from "@loveble/utils";
import { Button } from "@loveble/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@loveble/ui/dropdown-menu";
import {
  AIChatComposer,
  AIChatComposerHeader,
  AIChatComposerLeading,
  AIChatComposerSubmit,
  AIChatComposerTextarea,
  AIChatComposerTrailing,
  insertAIChatComposerToken,
  useAIChatComposerAnchor,
  type AIChatComposerCommand,
} from "@/components/ui/ai-chat-composer";
import { EffortSlider } from "@/components/ui/effort-slider";

import { ComposerAttachments } from "./ComposerAttachments";
import { ComposerIcon } from "./ComposerIcon";
import { ComposerMentions } from "./ComposerMentions";
import { ComposerMenu } from "./ComposerMenu";
import {
  EFFORT_LEVELS,
  COMMANDS,
  MODELS,
  MODES,
  SOURCES,
} from "./composer-data";
import { BRANDS, GLYPHS } from "./omposer-data-icons";
import { useChatComposer } from "./useChatComposer";
import { VoiceWave } from "./voice-wave";
import type { ComposerMode, ComposerVariant } from "./types";
import type { ChatContextItem } from "@/store/chat-context.store";
import { useFileDragStore } from "@/store/file-drag.store";

const commands: AIChatComposerCommand[] = COMMANDS.map((command) => ({
  value: command.name.replace(/^\//, ""),
  label: command.name,
  description: command.desc,
  group: command.group,
  icon: <ScrollIcon />,
}));

const sourceItems = SOURCES.filter(
  (source) => !source.attach && !source.brand
);
const connectorItems = SOURCES.filter((source) => !!source.brand);

export function ChatComposer({
  variant = "Rounded",
  value,
  onChange,
  onSend,
  onStop,
  sending = false,
  projectId,
  mentions = [],
  onRemoveMention,
  onOpenMention,
  mode,
  onModeChange,
  modeDisabled = false,
}: {
  variant?: ComposerVariant;
  value: string;
  onChange: (value: string) => void;
  onSend?: (payload: {
    text: string;
    files: File[];
  }) => void;
  onStop?: () => void;
  sending?: boolean;
  projectId?: string;
  mentions?: ChatContextItem[];
  onRemoveMention?: (id: string) => void;
  onOpenMention?: (mention: ChatContextItem) => void;
  /** Agent mode, shown in the model picker. Omit it and the picker is unchanged. */
  mode?: ComposerMode;
  onModeChange?: (mode: ComposerMode) => void;
  modeDisabled?: boolean;
}) {
  const pill = variant === "Pill";
  const modeLayoutId = useId();

  const {
    inputRef,

    model,
    selectModel,
    effort,
    setEffort,

    attachments,
    addFiles,
    removeAttachment,

    connected,
    setConnected,

    active,
    setActive,

    menu,
    rows,

    canSend,

    handleChange,
    handleKeyDown,

    pick,
    send,

    listening,
    startDictation,
    audioLevelRef,

    focusInput,
  } = useChatComposer({
    value,
    onChange,
    onSend,
    mentionCount: mentions.length,
    projectId,
  });

  const sendActive = canSend || sending;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { ref: composerRef, anchor } = useAIChatComposerAnchor();

  const insertToken = (token: string) => {
    insertAIChatComposerToken(inputRef.current, token);
    requestAnimationFrame(focusInput);
  };

  const handlePick = (row: {
    key: string;
    name: string;
    desc: string;
  }) => {
    if (row.key === "attach") {
      fileInputRef.current?.click();
      return;
    }

    pick(row);
  };

  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  const dragItem = useFileDragStore((s) => s.item);
  const overChat = useFileDragStore((s) => s.overChat);
  const mentionDropActive = Boolean(dragItem) && overChat;

  useEffect(() => {
    if (!dragItem) return;

    const onPointerMove = (event: PointerEvent) => {
      const el = composerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      useFileDragStore.getState().setOverChat(inside);
    };

    window.addEventListener("pointermove", onPointerMove);
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [composerRef, dragItem]);

  const handleDragEnter = (event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes("Files")) return;

    event.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes("Files")) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();

    if (event.relatedTarget === null) {
      dragDepth.current = 0;
      setIsDragging(false);
      return;
    }

    dragDepth.current = Math.max(0, dragDepth.current - 1);

    if (dragDepth.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);

    const files = Array.from(event.dataTransfer.files);

    if (files.length > 0) {
      addFiles(files);
    }
  };

  return (
    <div data-chat-dropzone className="w-full">
      <div className="relative">
        <ComposerMenu
          menu={menu}
          rows={rows}
          active={active}
          connected={connected}
          onHover={setActive}
          onClick={handlePick}
          onConnect={() => setConnected((current) => !current)}
        />

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (sending) {
              onStop?.();
            } else {
              send();
            }
          }}
        >
          <AIChatComposer
            ref={composerRef}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "min-h-15",
              // A fixed 30px radius stays a true pill at the 60px resting
              // height, and a rounded card (not an oval) when text wraps.
              pill ? "rounded-[30px]" : "rounded-3xl",
              "data-[multiline=true]:pb-1.5",
              (isDragging || mentionDropActive) &&
                "ring-2 ring-primary/30",
            )}
          >
            {(mentions.length > 0 || attachments.length > 0) && (
              <AIChatComposerHeader>
                <ComposerMentions
                  mentions={mentions}
                  variant={variant}
                  onRemove={(id) => onRemoveMention?.(id)}
                  onOpen={onOpenMention}
                />
                <ComposerAttachments
                  attachments={attachments}
                  variant={variant}
                  onRemove={removeAttachment}
                />
              </AIChatComposerHeader>
            )}

            <AIChatComposerTextarea
              ref={inputRef}
              value={value}
              onChange={(event) => handleChange(event.target.value)}
              onKeyDown={handleKeyDown}
              commands={commands}
              placeholder={listening ? "Listening…" : "Write a message…"}
              aria-label="Prompt"
            />

            <AIChatComposerLeading>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-lg"
                      className="rounded-full"
                      aria-label="Add attachments and sources"
                    />
                  }
                >
                  <Plus className="size-[18px]" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  anchor={anchor}
                  align="start"
                  side="top"
                  className="w-56!"
                >
                  <DropdownMenuItem
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <PaperclipIcon />
                    Add files or photos
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <ScrollIcon />
                      Skills
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {commands.map((command) => (
                        <DropdownMenuItem
                          key={command.value}
                          onClick={() =>
                            insertToken(`/${command.value}`)
                          }
                        >
                          {command.icon}
                          {command.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Layers2Icon />
                      Sources
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {sourceItems.map((source) => (
                        <DropdownMenuItem
                          key={source.key}
                          onClick={() =>
                            insertToken(`@${source.name}`)
                          }
                        >
                          <ComposerIcon size={15}>
                            {GLYPHS[source.glyph ?? "clip"]}
                          </ComposerIcon>
                          {source.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <UsersIcon />
                      Connectors
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {connectorItems.map((source) => (
                        <DropdownMenuItem
                          key={source.key}
                          onClick={() =>
                            insertToken(`@${source.name}`)
                          }
                        >
                          {source.brand ? BRANDS[source.brand] : null}
                          {source.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
            </AIChatComposerLeading>

            <AIChatComposerTrailing>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 rounded-full font-normal text-muted-foreground"
                    />
                  }
                >
                  {model.name} {EFFORT_LEVELS[effort]}
                  <ChevronDown
                    data-icon="inline-end"
                    className="size-3.5"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  anchor={anchor}
                  align="end"
                  side="top"
                  className="w-49! bg-muted p-0"
                >
                  <div className="flex flex-col gap-1 p-1">
                    <div className="rounded-xl bg-popover p-1 ring-[0.5px] ring-border">
                      <div className="px-2 pt-0.5 pb-1 text-[10.5px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Model
                      </div>
                      <DropdownMenuRadioGroup
                        value={model.key}
                        onValueChange={(key) => {
                          const next = MODELS.find(
                            (item) => item.key === key
                          );
                          if (next) selectModel(next);
                        }}
                      >
                        {MODELS.map((item) => (
                          <DropdownMenuRadioItem
                            key={item.key}
                            value={item.key}
                          >
                            <span className="flex-1 truncate">
                              {item.name}
                            </span>
                            <span className="text-2xs text-muted-foreground">
                              {item.tag}
                            </span>
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </div>
                  </div>
                  <EffortSlider
                    levels={EFFORT_LEVELS}
                    value={effort}
                    onValueChange={setEffort}
                    className="w-full gap-2 rounded-none bg-transparent p-3 text-2xs shadow-none ring-0 *:first:text-sm"
                  />
                  {mode && onModeChange && (
                    <div className="border-t border-border p-2">
                      <div
                        role="tablist"
                        aria-label="Agent mode"
                        className="flex w-full items-center gap-1 rounded-lg border border-border bg-muted/50 p-1 select-none"
                      >
                        {MODES.map((item) => {
                          const isActive = mode === item.key;
                          return (
                            <button
                              key={item.key}
                              type="button"
                              role="tab"
                              aria-selected={isActive}
                              disabled={modeDisabled}
                              onClick={() => onModeChange(item.key)}
                              className={cn(
                                "relative flex flex-1 cursor-pointer items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
                                isActive
                                  ? "text-foreground"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {isActive && (
                                <motion.span
                                  layoutId={modeLayoutId}
                                  transition={{
                                    type: "spring",
                                    stiffness: 380,
                                    damping: 32,
                                  }}
                                  className="absolute inset-0 rounded-md border border-border bg-popover shadow-xs"
                                />
                              )}
                              <span className="relative z-10">
                                {item.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                aria-label={
                  listening ? "Stop dictation" : "Start dictation"
                }
                aria-pressed={listening}
                onClick={startDictation}
                className={cn(
                  "rounded-full text-muted-foreground hover:text-foreground",
                  listening && "bg-foreground/[0.08] text-foreground"
                )}
              >
                {listening ? (
                  <VoiceWave levelRef={audioLevelRef} />
                ) : (
                  <Mic className="size-[18px]" />
                )}
              </Button>
              <AIChatComposerSubmit
                disabled={!sendActive}
                className="rounded-full"
                aria-label={sending ? "Stop generating" : "Send"}
              >
                {sending ? (
                  <Square className="size-4 fill-current" />
                ) : (
                  <ArrowUp className="size-[18px]" />
                )}
              </AIChatComposerSubmit>
            </AIChatComposerTrailing>

            {isDragging && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center gap-2 rounded-[inherit] bg-background/80 backdrop-blur-[1px]">
                <Upload className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Drop files here
                </span>
              </div>
            )}

            {mentionDropActive && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center gap-2 rounded-[inherit] bg-background/80 backdrop-blur-[1px]">
                <FilePlusCornerIcon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Add to chat
                </span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.md,.json,.ts,.tsx,.js,.jsx,.css,.html,.svg"
              className="hidden"
              onChange={(event) => {
                if (event.target.files) addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </AIChatComposer>
        </form>
      </div>
    </div>
  );
}
