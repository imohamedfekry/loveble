  "use client";

  import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
  } from "react";

  import { COMMANDS, MODELS, SOURCES } from "./composer-data";
  import { fileMention } from "@/lib/chat-context";
  import { useChatContextStore } from "@/store/chat-context.store";
  import { useFilesStore } from "@/store/file.store";
  import type { ProjectFileType } from "@/lib/api/apis/files/types";
  import type {
    ComposerAttachment,
    ComposerMenuType,
    ComposerModel,
    ComposerRow,
  } from "./types";

  const EMPTY_FILES: ProjectFileType[] = [];

  type SpeechRecognitionType = {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    start: () => void;
    stop: () => void;
    abort: () => void;
  };

  type SpeechRecognitionConstructor = new () => SpeechRecognitionType;

  function getSpeechRecognition(): SpeechRecognitionConstructor | null {
    if (typeof window === "undefined") return null;
    return (
      (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor })
        .webkitSpeechRecognition ??
      null
    );
  }

  function joinTranscript(...parts: string[]): string {
    return parts
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ");
  }

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
    const match = /(^|\s)([@/])([\w./-]*)$/.exec(draft);

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

  function resolveDirectory(
    query: string,
    byParent: Map<string | null, ProjectFileType[]>,
  ): {
    parentId: string | null;
    parentPath: string;
    filter: string | null;
  } {
    const segments = query
      .split("/")
      .filter((segment) => segment.length > 0);
    let parentId: string | null = null;
    const trail: string[] = [];
    let filter: string | null = null;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const children: ProjectFileType[] =
        byParent.get(parentId) ?? [];
      const folder: ProjectFileType | undefined =
        children.find(
          (child) =>
            child.type === "folder" && child.name === segment,
        );
      if (!folder) {
        filter = segments.slice(i).join("/");
        break;
      }
      trail.push(folder.name);
      parentId = folder.id;
    }

    return { parentId, parentPath: trail.join("/"), filter };
  }

  export function useChatComposer({
    value,
    onChange,
    onSend,
    mentionCount = 0,
    projectId,
  }: {
    value: string;
    onChange: (value: string) => void;
    onSend?: (payload: { text: string; files: File[] }) => void;
    mentionCount?: number;
    projectId?: string;
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

    const recognitionRef = useRef<SpeechRecognitionType | null>(null);
    const isListeningRef = useRef(false);
    const baseRef = useRef("");
    const sessionRef = useRef("");
    const restartTimerRef = useRef<number | null>(null);
    const valueRef = useRef(value);
    valueRef.current = value;

    const token = dismissed ? null : parseToken(value);

    const projectFiles = useFilesStore((state) =>
      projectId ? state.files[projectId] : undefined
    ) ?? EMPTY_FILES;

    const filesByParent = useMemo(() => {
      const byId = new Map(
        projectFiles.map((file) => [file.id, file]),
      );
      const byParent = new Map<string | null, ProjectFileType[]>();
      for (const file of projectFiles) {
        const children = byParent.get(file.parentId) ?? [];
        children.push(file);
        byParent.set(file.parentId, children);
      }
      const pathOf = (file: ProjectFileType): string => {
        const segments: string[] = [];
        let current: ProjectFileType | undefined = file;
        while (current) {
          segments.unshift(current.name);
          current = current.parentId
            ? byId.get(current.parentId)
            : undefined;
        }
        return segments.join("/");
      };
      return { byParent, pathOf };
    }, [projectFiles]);

    const menu: ComposerMenuType = plusOpen
      ? "at"
      : token
        ? token.kind === "at"
          ? projectId
            ? "files"
            : "at"
          : "slash"
        : null;

    const query = plusOpen ? "" : token?.query ?? "";

    const fileRows: ComposerRow[] = useMemo(() => {
      if (menu !== "files") return [];

      const { byParent, pathOf } = filesByParent;

      // Treat the text after `@` as a directory path: resolve as deep as it
      // matches folder names, then list the children of that folder. Any
      // remaining segment becomes a name filter on the current folder.
      const { parentId, filter } = resolveDirectory(
        query,
        byParent,
      );

      const candidates = [
        ...(byParent.get(parentId) ?? []),
      ];
      const lowered = filter?.toLowerCase();
      const visible = lowered
        ? candidates.filter((child) =>
            child.name.toLowerCase().includes(lowered)
          )
        : candidates;

      visible.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "folder" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      return visible.map((file) => ({
        key: file.id,
        name: file.name,
        desc: pathOf(file),
        fileType: file.type,
      }));
    }, [menu, filesByParent, query]);

    const rows: ComposerRow[] = useMemo(() => {
      if (menu === "files") {
        return fileRows;
      }

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
    }, [menu, query, fileRows]);

    const canSend =
      value.trim().length > 0 ||
      attachments.length > 0 ||
      mentionCount > 0;

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

    const rebaseSession = useCallback(() => {
      const recognition = recognitionRef.current;
      if (!isListeningRef.current || !recognition) return;
      try {
        recognition.abort();
      } catch {
        /* not started yet */
      }
    }, []);

    const applyExternalChange = useCallback(
      (next: string) => {
        onChange(next);
        if (isListeningRef.current) {
          baseRef.current = next;
          sessionRef.current = "";
          rebaseSession();
        }
      },
      [onChange, rebaseSession]
    );

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

      applyExternalChange("");
      closeMenus();
    }, [
      applyExternalChange,
      attachments,
      canSend,
      closeMenus,
      onSend,
      value,
    ]);

    const pick = useCallback(
      (row: ComposerRow) => {
        if (menu === "files") {
          const file = projectFiles.find(
            (item) => item.id === row.key
          );

          if (file) {
            useChatContextStore.getState().add(fileMention(file));
          }

          applyExternalChange(
            value.slice(0, token?.start ?? value.length)
          );

          setPlusOpen(false);
          setDismissed(false);

          requestAnimationFrame(focusInput);

          return;
        }

        const source = SOURCES.find(
          (item) => item.key === row.key
        );

        if (source?.attach) {

          applyExternalChange(
            value.slice(0, token?.start ?? value.length)
          );

          setPlusOpen(false);

          return;
        }

        if (menu === "at") {
          applyExternalChange(
            `${token ? value.slice(0, token.start) : value}@${row.name} `
          );
        } else {
          applyExternalChange(
            `${token ? value.slice(0, token.start) : value}${row.name} `
          );
        }

        setPlusOpen(false);
        setDismissed(false);

        requestAnimationFrame(focusInput);
      },
      [
        applyExternalChange,
        focusInput,
        menu,
        projectFiles,
        token,
        value,
      ]
    );

    const descend = useCallback(
      (row: ComposerRow) => {
        if (menu !== "files" || !token) return;

        const { parentPath } = resolveDirectory(
          query,
          filesByParent.byParent,
        );
        const nextQuery = `${parentPath ? `${parentPath}/` : ""}${row.name}/`;

        applyExternalChange(
          `${value.slice(0, token.start)}@${nextQuery}`,
        );
        setPlusOpen(false);
        setDismissed(false);

        requestAnimationFrame(focusInput);
      },
      [
        applyExternalChange,
        filesByParent,
        focusInput,
        menu,
        query,
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

          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();

            if (rows[active]) {
              pick(rows[active]);
            }

            return;
          }

          if (event.key === "Tab") {
            event.preventDefault();

            const row = rows[active];

            if (row) {
              if (menu === "files" && row.fileType === "folder") {
                descend(row);
              } else {
                pick(row);
              }
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
      [active, closeMenus, descend, menu, pick, rows, send]
    );

    const handleChange = useCallback(
      (nextValue: string) => {
        applyExternalChange(nextValue);
        setDismissed(false);
        setPlusOpen(false);
      },
      [applyExternalChange]
    );

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number>(0);
    const audioLevelRef = useRef(0);
    const stopAudioAnalysis = useCallback(() => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      analyserRef.current = null;
      audioLevelRef.current = 0;
    }, []);

    const startAudioAnalysis = useCallback(async () => {
      if (streamRef.current || !isListeningRef.current) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        if (!isListeningRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        void audioContext.resume();

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          audioLevelRef.current = Math.min(1, avg / 128);
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch (err) {
        console.warn("[composer] Microphone access denied:", err);
      }
    }, []);

    const clearRestartTimer = useCallback(() => {
      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
    }, []);

    const resetDictationRefs = useCallback(() => {
      baseRef.current = "";
      sessionRef.current = "";
      clearRestartTimer();
    }, [clearRestartTimer]);

    const stopDictation = useCallback(() => {
      isListeningRef.current = false;
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      if (recognition) {
        recognition.onresult = null;
        recognition.onstart = null;
        recognition.onend = null;
        recognition.onerror = null;
        try {
          recognition.stop();
        } catch {
          /* already stopped */
        }
      }
      stopAudioAnalysis();
      resetDictationRefs();
      setListening(false);
    }, [resetDictationRefs, stopAudioAnalysis]);

    const startDictation = useCallback(() => {
      if (isListeningRef.current) {
        stopDictation();
        return;
      }

      const SpeechRecognition = getSpeechRecognition();
      if (!SpeechRecognition) {
        console.warn("[composer] Speech recognition not supported");
        return;
      }

      baseRef.current = valueRef.current;
      sessionRef.current = "";
      clearRestartTimer();

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "ar-EG";

      recognition.onstart = () => {
        if (!isListeningRef.current || recognitionRef.current !== recognition) {
          return;
        }
        startAudioAnalysis();
      };

      recognition.onresult = (event) => {
        const finals: string[] = [];
        const interims: string[] = [];

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finals.push(result[0].transcript);
          } else {
            interims.push(result[0].transcript);
          }
        }

        sessionRef.current = joinTranscript(...finals);

        const display = joinTranscript(
          baseRef.current,
          sessionRef.current,
          ...interims
        );
        if (display) {
          onChange(display);
        }
      };

      recognition.onend = () => {
        if (!isListeningRef.current || recognitionRef.current !== recognition) {
          return;
        }

        baseRef.current = joinTranscript(baseRef.current, sessionRef.current);
        sessionRef.current = "";

        onChange(baseRef.current);

        clearRestartTimer();
        restartTimerRef.current = window.setTimeout(() => {
          restartTimerRef.current = null;
          if (!isListeningRef.current || recognitionRef.current !== recognition) {
            return;
          }
          try {
            recognition.start();
          } catch {
            /* already started */
          }
        }, 150);
      };

      recognition.onerror = (event) => {
        if (event.error === "no-speech" || event.error === "aborted") {
          return;
        }

        console.error("[composer] Speech recognition error:", event.error);
        isListeningRef.current = false;
        recognitionRef.current = null;
        stopAudioAnalysis();
        resetDictationRefs();
        setListening(false);
      };

      recognitionRef.current = recognition;
      isListeningRef.current = true;
      setListening(true);
      recognition.start();
    }, [
      clearRestartTimer,
      onChange,
      resetDictationRefs,
      startAudioAnalysis,
      stopAudioAnalysis,
      stopDictation,
    ]);

    useEffect(() => {
      return () => {
        isListeningRef.current = false;
        const recognition = recognitionRef.current;
        recognitionRef.current = null;
        if (recognition) {
          recognition.onresult = null;
          recognition.onstart = null;
          recognition.onend = null;
          recognition.onerror = null;
          try {
            recognition.abort();
          } catch {
            /* already stopped */
          }
        }
        stopAudioAnalysis();
        resetDictationRefs();
      };
    }, [resetDictationRefs, stopAudioAnalysis]);

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
        32 * 3 + modelButton.offsetWidth;

      const inlineGaps = 6 * 4;

      const controlsPaddingWidth = 16;

      const inlineInputWidth =
        controls.clientWidth -
        controlsPaddingWidth -
        fixedControlsWidth -
        inlineGaps;

      const needsFullWidth =
        value.includes("\n") ||
        measure.offsetWidth + 16 > inlineInputWidth;

      if (needsFullWidth !== expanded) {
        setExpanded(needsFullWidth);
      }

      const minHeight = 32;
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
      audioLevelRef,

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