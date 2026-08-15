"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { COMMANDS, MODELS, SOURCES } from "./composer-data";
import type {
  ComposerAttachment,
  ComposerMenuType,
  ComposerModel,
  ComposerRow,
} from "./types";

function createAttachment(file: File): ComposerAttachment {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    file,
    previewUrl: file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : undefined,
  };
}

function parseToken(draft: string) {
  const match = /(^|\s)([@/])([\w-]*)$/.exec(draft);

  if (!match) return null;

  return {
    kind: match[2] === "@" ? "at" : "slash",
    query: match[3].toLowerCase(),
    start: match.index + match[1].length,
  } as {
    kind: "at" | "slash";
    query: string;
    start: number;
  };
}

export function useChatComposer({
  value,
  onChange,
  onSend,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend?: (payload: { text: string; files: File[] }) => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const modelRef = useRef<HTMLButtonElement>(null);

  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const modelRowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [plusOpen, setPlusOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [model, setModel] = useState(MODELS[1]);

  const [attachments, setAttachments] = useState<
    ComposerAttachment[]
  >([]);

  const [connected, setConnected] = useState(false);
  const [active, setActive] = useState(0);
  const [modelHovered, setModelHovered] = useState<number | null>(
    null
  );

  const [expanded, setExpanded] = useState(false);

  const [rowBox, setRowBox] = useState<{
    top: number;
    height: number;
  } | null>(null);

  const [modelBox, setModelBox] = useState<{
    top: number;
    height: number;
  } | null>(null);

  const [listening, setListening] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [engaged, setEngaged] = useState(false);

  const token = dismissed ? null : parseToken(value);

  const menu: ComposerMenuType = plusOpen
    ? "at"
    : token?.kind ?? null;

  const query = plusOpen ? "" : token?.query ?? "";

  const rows: ComposerRow[] = useMemo(() => {
    if (menu === "at") {
      return SOURCES
        .filter((source) =>
          source.name.toLowerCase().includes(query)
        )
        .map((source) => ({
          key: source.key,
          name: source.name,
          desc: source.desc,
        }));
    }

    if (menu === "slash") {
      return COMMANDS
        .filter((command) =>
          command.name.slice(1).startsWith(query)
        )
        .map((command) => ({
          key: command.key,
          name: command.name,
          desc: command.desc,
        }));
    }

    return [];
  }, [menu, query]);

  const canSend =
    value.trim().length > 0 || attachments.length > 0;

  const menuQueryKey = `${menu ?? ""}|${query ?? ""}|${rows.length}`;
  const [prevMenuQueryKey, setPrevMenuQueryKey] = useState(menuQueryKey);

  if (prevMenuQueryKey !== menuQueryKey) {
    setPrevMenuQueryKey(menuQueryKey);
    setActive(0);
    setEngaged(false);
  }

  useLayoutEffect(() => {
    const target = rowRefs.current[active];

    if (target) {
      setRowBox({
        top: target.offsetTop,
        height: target.offsetHeight,
      });
    }
  }, [menu, query, active, rows.length, connected]);

  const modelIndex = MODELS.findIndex(
    (item) => item.key === model.key
  );

  useLayoutEffect(() => {
    if (!modelOpen) return;

    const target =
      modelRowRefs.current[modelHovered ?? modelIndex];

    if (target) {
      setModelBox({
        top: target.offsetTop,
        height: target.offsetHeight,
      });
    }
  }, [modelOpen, modelHovered, modelIndex]);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const next = Array.from(files).map(createAttachment);

    if (!next.length) return;

    setAttachments((current) => {
      const existing = new Set(
        current.map((item) => item.id)
      );

      return [
        ...current,
        ...next.filter(
          (item) => !existing.has(item.id)
        ),
      ];
    });
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) => {
      const target = current.find(
        (item) => item.id === id
      );

      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return current.filter((item) => item.id !== id);
    });
  }, []);

  const closeMenus = useCallback(() => {
    setPlusOpen(false);
    setModelOpen(false);
  }, []);

  const send = useCallback(() => {
    if (!canSend) return;

    onSend?.({
      text: value.trim(),
      files: attachments.map((item) => item.file),
    });

    setAttachments((current) => {
      current.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });

      return [];
    });

    onChange("");
    closeMenus();
  }, [
    attachments,
    canSend,
    closeMenus,
    onChange,
    onSend,
    value,
  ]);

  const pick = useCallback(
    (row: ComposerRow) => {
      const source = SOURCES.find(
        (item) => item.key === row.key
      );

      if (source?.attach) {

        onChange(
          value.slice(0, token?.start ?? value.length)
        );

        setPlusOpen(false);

        return;
      }

      if (menu === "at") {
        onChange(
          `${token ? value.slice(0, token.start) : value}@${row.name} `
        );
      } else {
        onChange(
          `${token ? value.slice(0, token.start) : value}${row.name} `
        );
      }

      setPlusOpen(false);
      setDismissed(false);

      requestAnimationFrame(focusInput);
    },
    [
      focusInput,
      menu,
      onChange,
      token,
      value,
    ]
  );

  const selectModel = useCallback(
    (next: ComposerModel) => {
      setModel(next);
      setModelOpen(false);
      requestAnimationFrame(focusInput);
    },
    [focusInput]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (menu && rows.length > 0) {
        if (
          event.key === "ArrowDown" ||
          event.key === "ArrowUp"
        ) {
          event.preventDefault();

          setEngaged(true);

          setActive(
            (current) =>
              (current +
                (event.key === "ArrowDown"
                  ? 1
                  : rows.length - 1)) %
              rows.length
          );

          return;
        }

        if (
          (event.key === "Enter" && !event.shiftKey) ||
          event.key === "Tab"
        ) {
          event.preventDefault();

          if (rows[active]) {
            pick(rows[active]);
          }

          return;
        }
      }

      if (event.key === "Escape") {
        setDismissed(true);
        closeMenus();
        return;
      }

      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.nativeEvent.isComposing
      ) {
        event.preventDefault();
        send();
      }
    },
    [active, closeMenus, menu, pick, rows, send]
  );

  const handleChange = useCallback(
    (nextValue: string) => {
      onChange(nextValue);
      setDismissed(false);
      setPlusOpen(false);
    },
    [onChange]
  );

  const startDictation = useCallback(() => {
    setListening((current) => !current);
  }, []);

  const openPlusMenu = useCallback(() => {
    setModelOpen(false);
    setPlusOpen((current) => !current);
    focusInput();
  }, [focusInput]);

  useLayoutEffect(() => {
    const input = inputRef.current;
    const controls = controlsRef.current;
    const measure = measureRef.current;
    const modelButton = modelRef.current;

    if (
      !input ||
      !controls ||
      !measure ||
      !modelButton
    ) {
      return;
    }

    const fixedControlsWidth =
      28 * 3 + modelButton.offsetWidth;

    const inlineGaps = 4 * 4;

    const inlineInputWidth =
      controls.clientWidth -
      fixedControlsWidth -
      inlineGaps;

    const needsFullWidth =
      value.includes("\n") ||
      measure.offsetWidth + 8 > inlineInputWidth;

    if (needsFullWidth !== expanded) {
      setExpanded(needsFullWidth);
    }

    const minHeight = 28;
    const maxHeight = 100;

    input.style.height = "0px";

    const contentHeight = input.scrollHeight;

    input.style.height = `${Math.min(
      Math.max(contentHeight, minHeight),
      maxHeight
    )}px`;

    input.style.overflowY =
      contentHeight > maxHeight ? "auto" : "hidden";
  }, [value, expanded]);

  return {
    inputRef,
    controlsRef,
    measureRef,
    modelRef,
    rowRefs,
    modelRowRefs,

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
    closeMenus,
    pick,
    send,

    focusInput,
  };
}