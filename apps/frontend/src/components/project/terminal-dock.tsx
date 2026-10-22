"use client";

import { cn } from "@loveble/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { io, type Socket } from "socket.io-client";
import {
  EraserIcon,
  RotateCcwIcon,
  SquareTerminalIcon,
  XIcon,
} from "lucide-react";
import type { ITheme, Terminal as XTerm } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";

import { TERMINAL_WS_URL } from "@/lib/socket/socket";

const MIN_HEIGHT = 180;
const DEFAULT_HEIGHT = 300;
const MAX_HEIGHT = 720;
const HEIGHT_STORAGE_KEY = "loveble:terminal-height";

type TerminalStatus =
  | "connecting"
  | "ready"
  | "reconnecting"
  | "exited"
  | "error";

const DARK_THEME: ITheme = {
  background: "#262624",
  foreground: "#f4f4f5",
  cursor: "#82bcff",
  cursorAccent: "#262624",
  selectionBackground: "rgba(75, 115, 255, 0.32)",
  selectionInactiveBackground: "rgba(75, 115, 255, 0.16)",
  black: "#1c1c1b",
  red: "#ff6b6b",
  green: "#6fcf97",
  yellow: "#ffd29d",
  blue: "#6f8bff",
  magenta: "#ff66f4",
  cyan: "#56c1d6",
  white: "#e4e4e7",
  brightBlack: "#6b6b74",
  brightRed: "#ff8787",
  brightGreen: "#8ee0b3",
  brightYellow: "#ffe0b3",
  brightBlue: "#93a7ff",
  brightMagenta: "#ff8cf7",
  brightCyan: "#7ad6e6",
  brightWhite: "#fafafa",
};

const LIGHT_THEME: ITheme = {
  background: "#ffffff",
  foreground: "#1c1c1c",
  cursor: "#4b73ff",
  cursorAccent: "#ffffff",
  selectionBackground: "rgba(75, 115, 255, 0.22)",
  selectionInactiveBackground: "rgba(75, 115, 255, 0.1)",
  black: "#1c1c1c",
  red: "#c81e1e",
  green: "#2f855a",
  yellow: "#b7791f",
  blue: "#3b5bdb",
  magenta: "#8b1ea8",
  cyan: "#0e7490",
  white: "#e7e3da",
  brightBlack: "#7a766f",
  brightRed: "#e02424",
  brightGreen: "#38a169",
  brightYellow: "#d69e2e",
  brightBlue: "#4b73ff",
  brightMagenta: "#a12bbd",
  brightCyan: "#0e8aa8",
  brightWhite: "#f4f2ed",
};

function terminalTheme(dark: boolean): ITheme {
  return dark ? DARK_THEME : LIGHT_THEME;
}

function readStoredHeight(): number {
  if (typeof window === "undefined") return DEFAULT_HEIGHT;
  const stored = Number(window.localStorage.getItem(HEIGHT_STORAGE_KEY));
  if (!Number.isFinite(stored) || stored <= 0) return DEFAULT_HEIGHT;
  return clampHeight(stored);
}

function clampHeight(value: number): number {
  const max =
    typeof window === "undefined"
      ? MAX_HEIGHT
      : Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, window.innerHeight * 0.62));
  return Math.round(Math.min(Math.max(value, MIN_HEIGHT), max));
}

const STATUS_META: Record<
  TerminalStatus,
  { label: string; dot: string; text: string; pulse?: boolean }
> = {
  connecting: {
    label: "Connecting",
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    pulse: true,
  },
  ready: {
    label: "Running",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  reconnecting: {
    label: "Reconnecting",
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    pulse: true,
  },
  exited: {
    label: "Exited",
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
  },
  error: {
    label: "Error",
    dot: "bg-destructive",
    text: "text-destructive",
  },
};

function StatusPill({ status }: { status: TerminalStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-[10.5px] font-medium",
        meta.text,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          meta.dot,
          meta.pulse && "animate-pulse",
        )}
      />
      {meta.label}
    </span>
  );
}

function HeaderButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-foreground/5 hover:text-foreground active:scale-95"
    >
      {children}
    </button>
  );
}

export function TerminalDock({
  projectId,
  open,
  onClose,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const darkRef = useRef(resolvedTheme !== "light");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const readyRef = useRef(false);
  const [status, setStatus] = useState<TerminalStatus>("connecting");
  const [session, setSession] = useState<{
    userName?: string;
    projectId?: string;
    cwd?: string;
  } | null>(null);
  const [height, setHeight] = useState(readStoredHeight);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  useEffect(() => {
    darkRef.current = resolvedTheme !== "light";
    if (termRef.current) {
      termRef.current.options.theme = terminalTheme(darkRef.current);
    }
  }, [resolvedTheme]);

  useEffect(() => {
    try {
      window.localStorage.setItem(HEIGHT_STORAGE_KEY, String(height));
    } catch {
      // Storage can be disabled (private mode) — resizing still works.
    }
  }, [height]);

  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let term: XTerm | null = null;
    let fit: FitAddon | null = null;
    let socket: Socket | null = null;
    let observer: ResizeObserver | null = null;
    let frame = 0;
    let connectedOnce = false;
    let authFailed = false;

    setStatus("connecting");

    void (async () => {
      const [{ Terminal }, { FitAddon: Fit }, { WebLinksAddon }] =
        await Promise.all([
          import("@xterm/xterm"),
          import("@xterm/addon-fit"),
          import("@xterm/addon-web-links"),
        ]);
      if (disposed) return;

      term = new Terminal({
        cursorBlink: true,
        cursorStyle: "bar",
        cursorWidth: 1.5,
        fontFamily:
          "'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        fontSize: 12.5,
        fontWeight: "400",
        fontWeightBold: "500",
        letterSpacing: 0,
        lineHeight: 1.35,
        scrollback: 5000,
        smoothScrollDuration: 100,
        macOptionIsMeta: true,
        rightClickSelectsWord: true,
        theme: terminalTheme(darkRef.current),
      });
      fit = new Fit();
      term.loadAddon(fit);
      term.loadAddon(
        new WebLinksAddon((_event, uri) =>
          window.open(uri, "_blank", "noopener"),
        ),
      );
      term.open(container);
      termRef.current = term;
      fitRef.current = fit;

      try {
        fit.fit();
      } catch {
        // The container can still be 0×0 during the open animation.
      }

      term.onData((data) => {
        if (!readyRef.current) return;
        socketRef.current?.emit("terminal:input", { data });
      });

      socket = io(TERMINAL_WS_URL, {
        transports: ["websocket"],
        withCredentials: true,
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        authFailed = false;
    setStatus("connecting");
    setSession(null);
        if (connectedOnce) term?.write("\r\n\x1b[2m— reconnected —\x1b[0m\r\n");
        connectedOnce = true;
        socket?.emit("terminal:start", {
          projectId,
          cols: term?.cols ?? 80,
          rows: term?.rows ?? 24,
        });
      });

      socket.on("terminal:ready", (payload: unknown) => {
        readyRef.current = true;
        setStatus("ready");
        if (payload && typeof payload === "object") {
          const meta = payload as {
            userName?: unknown;
            projectId?: unknown;
            cwd?: unknown;
          };
          setSession({
            userName:
              typeof meta.userName === "string" ? meta.userName : undefined,
            projectId:
              typeof meta.projectId === "string" ? meta.projectId : undefined,
            cwd: typeof meta.cwd === "string" ? meta.cwd : undefined,
          });
        }
        requestAnimationFrame(() => term?.focus());
      });

      socket.on("terminal:data", (data: unknown) => {
        if (typeof data === "string") term?.write(data);
      });

      socket.on("terminal:exit", (payload: unknown) => {
        readyRef.current = false;
        setStatus("exited");
        const code =
          payload && typeof payload === "object" && "exitCode" in payload
            ? (payload as { exitCode?: unknown }).exitCode
            : undefined;
        term?.write(
          `\r\n\x1b[0m\x1b[2mShell session ended${
            typeof code === "number" ? ` (exit ${code})` : ""
          }. Press ↻ to restart.\x1b[0m\r\n`,
        );
      });

      socket.on("terminal:error", (payload: unknown) => {
        readyRef.current = false;
        setStatus("error");
        const message =
          payload &&
          typeof payload === "object" &&
          typeof (payload as { message?: unknown }).message === "string"
            ? (payload as { message: string }).message
            : "The terminal failed to start.";
        term?.write(`\r\n\x1b[31m${message.replace(/\x1b/g, "")}\x1b[0m\r\n`);
      });

      socket.on("connect:error", (payload: unknown) => {
        authFailed = true;
        readyRef.current = false;
        setStatus("error");
        const message =
          payload &&
          typeof payload === "object" &&
          typeof (payload as { message?: unknown }).message === "string"
            ? (payload as { message: string }).message
            : "Unauthorized";
        term?.write(`\r\n\x1b[31m${message.replace(/\x1b/g, "")}\x1b[0m\r\n`);
        socket?.disconnect();
      });

      socket.on("disconnect", () => {
        readyRef.current = false;
        if (!disposed && !authFailed) setStatus("reconnecting");
      });

      socket.on("connect_error", () => {
        readyRef.current = false;
        if (!disposed) setStatus("error");
      });

      observer = new ResizeObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          if (!fit || !term) return;
          try {
            fit.fit();
          } catch {
            return;
          }
          if (readyRef.current) {
            socket?.emit("terminal:resize", {
              cols: term.cols,
              rows: term.rows,
            });
          }
        });
      });
      observer.observe(container);
    })();

    return () => {
      disposed = true;
      readyRef.current = false;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
      term?.dispose();
      termRef.current = null;
      fitRef.current = null;
      socketRef.current = null;
    };
  }, [open, projectId]);

  const restart = useCallback(() => {
    const term = termRef.current;
    const socket = socketRef.current;
    if (!term || !socket?.connected) return;

    readyRef.current = false;
    setStatus("connecting");
    term.write("\r\n\x1b[2mRestarting shell…\x1b[0m\r\n");
    socket.emit("terminal:start", {
      projectId,
      cols: term.cols,
      rows: term.rows,
    });
  }, [projectId]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragRef.current = { startY: event.clientY, startHeight: height };
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.style.userSelect = "none";
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    setHeight(clampHeight(drag.startHeight + drag.startY - event.clientY));
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    document.body.style.userSelect = "";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  if (!open) return null;

  return (
    <div className="shrink-0 border-t border-border bg-card" style={{ height }}>
      <div className="flex h-full flex-col overflow-hidden bg-card">
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize terminal"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="group flex h-2.5 w-full shrink-0 cursor-row-resize touch-none items-center justify-center"
        >
          <span className="h-0.5 w-9 rounded-full bg-border transition-colors duration-150 group-hover:bg-muted-foreground/50" />
        </div>

        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-card/80 px-3 backdrop-blur-sm">
          <SquareTerminalIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Terminal</span>
          <StatusPill status={status} />
          {(session?.userName || session?.projectId) && (
            <span
              title={session.cwd}
              className="ml-1 hidden max-w-[18rem] truncate rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline"
            >
              {session.userName ? `${session.userName}@` : ""}
              {session.projectId ?? ""}
            </span>
          )}
          <div className="flex-1" />

          <HeaderButton
            label="Clear terminal"
            onClick={() => termRef.current?.clear()}
          >
            <EraserIcon className="size-3.5" />
          </HeaderButton>
          <HeaderButton label="Restart shell" onClick={restart}>
            <RotateCcwIcon className="size-3.5" />
          </HeaderButton>
          <HeaderButton label="Close terminal" onClick={onClose}>
            <XIcon className="size-3.5" />
          </HeaderButton>
        </div>

        <div className="terminal-surface relative min-h-0 flex-1 bg-card">
          <div ref={containerRef} className="size-full px-2 py-1.5" />
        </div>
      </div>
    </div>
  );
}
