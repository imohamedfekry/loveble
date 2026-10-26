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
/** Dragging the dock below this height and releasing closes it. */
const CLOSE_DRAG_THRESHOLD = 100;

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

function maxDockHeight(): number {
  if (typeof window === "undefined") return MAX_HEIGHT;
  return Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, window.innerHeight * 0.62));
}

function clampHeight(value: number): number {
  return Math.round(Math.min(Math.max(value, MIN_HEIGHT), maxDockHeight()));
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
  /** Forces the next (re)connection to create a brand-new server session. */
  const freshRestart = useRef(false);
  const [status, setStatus] = useState<TerminalStatus>("connecting");
  const [height, setHeight] = useState(readStoredHeight);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  useEffect(() => {
    darkRef.current = resolvedTheme !== "light";
    if (termRef.current) {
      termRef.current.options.theme = terminalTheme(darkRef.current);
    }
  }, [resolvedTheme]);

  useEffect(() => {
    if (dragging) return; // persist once per drag, not per pixel
    try {
      window.localStorage.setItem(HEIGHT_STORAGE_KEY, String(height));
    } catch {
      // Storage can be disabled (private mode) — resizing still works.
    }
  }, [height, dragging]);

  // The dock height is stored in pixels, so a shrinking window can leave it
  // taller than the workspace: the bottom rows then get clipped by the outer
  // overflow-hidden and the terminal looks stuck at its old size.
  useEffect(() => {
    const onResize = () => setHeight((current) => clampHeight(current));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
    let fitTimer: ReturnType<typeof setTimeout> | null = null;
    /** Dimensions the server (shell/PTY) already knows about. */
    let lastSentCols = 0;
    let lastSentRows = 0;
    let connectedOnce = false;
    let hardFail = false;
    let startAttempts = 0;
    let connectFailures = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let readyTimer: ReturnType<typeof setTimeout> | null = null;

    const MAX_START_ATTEMPTS = 5;
    const MAX_AUTH_ATTEMPTS = 5;
    const MAX_CONNECT_FAILURES = 10;
    const READY_TIMEOUT_MS = 60_000;

    // Set by the Restart button when the socket is down (or exited); consumed
    // by the next "connect" so the revived session is forced fresh.
    const freshRestartRef = freshRestart;

    setStatus("connecting");

    /**
     * Fit every trigger through one place: dock drag, window resize, panel
     * switch, font load and reconnect all collapse into a single fit per
     * frame. Emitting the resize only when the grid actually changed keeps the
     * PTY in sync without spamming it during a drag.
     */
    const pushResize = () => {
      if (!readyRef.current || !term) return;
      if (term.cols === lastSentCols && term.rows === lastSentRows) return;
      lastSentCols = term.cols;
      lastSentRows = term.rows;
      socket?.emit("terminal:resize", { cols: term.cols, rows: term.rows });
    };

    const fitNow = () => {
      if (disposed || !fit || !term) return;
      // Collapsed/hidden boxes measure 0×0. Fitting there clamps the grid to
      // the minimum and the wrong dimensions then stick.
      if (container.clientWidth === 0 || container.clientHeight === 0) return;
      try {
        fit.fit();
      } catch {
        return;
      }
      pushResize();
    };

    const scheduleFit = () => {
      if (disposed) return;
      const run = () => {
        cancelAnimationFrame(frame);
        frame = 0;
        if (fitTimer) {
          clearTimeout(fitTimer);
          fitTimer = null;
        }
        fitNow();
      };
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(run);
      // Browsers pause rAF for occluded windows, so a rAF-only fit can be
      // deferred forever and the grid stays at the previous size. The timer
      // fallback always lands.
      if (fitTimer) clearTimeout(fitTimer);
      fitTimer = setTimeout(run, 120);
    };

    const onViewportChange = () => scheduleFit();
    const onFontsLoaded = () => scheduleFit();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);
    // Returning to an occluded/minimized window never fires visibilitychange,
    // and without frames the grid would stay at its previous dimensions.
    window.addEventListener("focus", onViewportChange);
    window.addEventListener("pageshow", onViewportChange);
    document.addEventListener("visibilitychange", onViewportChange);
    document.fonts?.addEventListener("loadingdone", onFontsLoaded);

    const clearTimers = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (readyTimer) {
        clearTimeout(readyTimer);
        readyTimer = null;
      }
    };

    const armReadyTimeout = () => {
      if (readyTimer) clearTimeout(readyTimer);
      readyTimer = setTimeout(() => {
        if (disposed || readyRef.current) return;
        // The backend may still be preparing the sandbox (this is heavy).
        // Keep retrying instead of hanging on "Connecting" forever.
        if (startAttempts < MAX_START_ATTEMPTS) {
          term?.write(
            "\r\n\x1b[2m— still connecting, retrying —\x1b[0m\r\n",
          );
          emitStart();
          return;
        }
        hardFail = true;
        socket?.disconnect();
        setStatus("error");
      }, READY_TIMEOUT_MS);
    };

    const emitStart = (opts?: { fresh?: boolean }) => {
      if (disposed || !socket?.connected || !term) return;
      startAttempts += 1;
      socket.emit("terminal:start", {
        projectId,
        cols: term.cols,
        rows: term.rows,
        fresh: opts?.fresh ?? false,
      });
      lastSentCols = term.cols;
      lastSentRows = term.rows;
      armReadyTimeout();
    };

    const scheduleStart = () => {
      if (disposed) return;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => emitStart(), 700 * startAttempts);
    };

    const retryAfterFailure = () => {
      if (disposed) return;
      if (startAttempts >= MAX_START_ATTEMPTS) {
        setStatus("error");
        return;
      }
      setStatus("connecting");
      scheduleStart();
    };

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

      // First fit runs synchronously (the container has its final size by the
      // time effects run), then again on the next frame/timer and once the web
      // font xterm measures its cell with has finished loading — a fit against
      // fallback metrics leaves the terminal on the old cols/rows.
      fitNow();
      scheduleFit();
      void document.fonts?.ready.then(() => {
        if (disposed) return;
        scheduleFit();
        if (term) term.refresh(0, term.rows - 1);
      });

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
        connectFailures = 0;
        startAttempts = 0;
        hardFail = false;
        setStatus("connecting");
        if (connectedOnce) term?.write("\r\n\x1b[2m— reconnected —\x1b[0m\r\n");
        connectedOnce = true;
        const fresh = freshRestartRef.current;
        freshRestartRef.current = false;
        emitStart({ fresh });
      });

      socket.on("terminal:ready", (payload: unknown) => {
        if (readyTimer) {
          clearTimeout(readyTimer);
          readyTimer = null;
        }
        startAttempts = 0;
        readyRef.current = true;
        setStatus("ready");
        // The shell now owns the PTY size; make sure it matches the current
        // grid before typing.
        scheduleFit();
        requestAnimationFrame(() => term?.focus());
      });

      socket.on("terminal:data", (data: unknown) => {
        if (typeof data === "string") term?.write(data);
      });

      socket.on("terminal:exit", (payload: unknown) => {
        if (readyTimer) {
          clearTimeout(readyTimer);
          readyTimer = null;
        }
        readyRef.current = false;
        setStatus("exited");
        const code =
          payload && typeof payload === "object" && "exitCode" in payload
            ? (payload as { exitCode?: unknown }).exitCode
            : undefined;
        term?.write(
          `\r\n\x1b[0m\x1b[2mTerminal session ended${
            typeof code === "number" ? ` (exit ${code})` : ""
          }. Press ↻ to restart.\x1b[0m\r\n`,
        );
      });

      socket.on("terminal:error", (payload: unknown) => {
        if (readyTimer) {
          clearTimeout(readyTimer);
          readyTimer = null;
        }
        readyRef.current = false;
        const meta = (payload ?? {}) as { message?: unknown; code?: unknown };
        const message =
          typeof meta.message === "string"
            ? meta.message
            : "The terminal failed to start.";
        term?.write(`\r\n\x1b[31m${message.replace(/\x1b/g, "")}\x1b[0m\r\n`);
        // Fatal errors (bad project, unauthorized) never recover on their
        // own; transient ones (sandbox provisioning) are worth retrying.
        if (meta.code === "fatal") {
          hardFail = true;
          setStatus("error");
          return;
        }
        retryAfterFailure();
      });

      socket.on("connect:error", (payload: unknown) => {
        if (readyTimer) {
          clearTimeout(readyTimer);
          readyTimer = null;
        }
        readyRef.current = false;
        const message =
          payload &&
          typeof payload === "object" &&
          typeof (payload as { message?: unknown }).message === "string"
            ? (payload as { message: string }).message
            : "Unauthorized";
        term?.write(`\r\n\x1b[31m${message.replace(/\x1b/g, "")}\x1b[0m\r\n`);
        // The server closes the socket after an auth failure. The cookie may
        // simply not have been attached yet — give the handshake a few more
        // chances instead of killing the socket forever.
        connectFailures += 1;
        if (connectFailures < MAX_AUTH_ATTEMPTS) {
          setStatus("reconnecting");
          return;
        }
        hardFail = true;
        socket?.disconnect();
        setStatus("error");
      });

      socket.on("disconnect", () => {
        if (readyTimer) {
          clearTimeout(readyTimer);
          readyTimer = null;
        }
        readyRef.current = false;
        if (!disposed && !hardFail) setStatus("reconnecting");
      });

      socket.on("connect_error", () => {
        connectFailures += 1;
        if (readyTimer) {
          clearTimeout(readyTimer);
          readyTimer = null;
        }
        readyRef.current = false;
        if (disposed) return;
        if (connectFailures >= MAX_CONNECT_FAILURES) {
          hardFail = true;
          socket?.disconnect();
          setStatus("error");
          return;
        }
        // socket.io keeps retrying the handshake on its own.
        setStatus("reconnecting");
      });

      // Observe both the fit container and the surface it fills: a split/panel
      // change resizes the surface, the container follows it.
      observer = new ResizeObserver(scheduleFit);
      observer.observe(container);
      if (container.parentElement) observer.observe(container.parentElement);
    })();

    return () => {
      disposed = true;
      readyRef.current = false;
      cancelAnimationFrame(frame);
      if (fitTimer) {
        clearTimeout(fitTimer);
        fitTimer = null;
      }
      clearTimers();
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
      window.removeEventListener("focus", onViewportChange);
      window.removeEventListener("pageshow", onViewportChange);
      document.removeEventListener("visibilitychange", onViewportChange);
      document.fonts?.removeEventListener("loadingdone", onFontsLoaded);
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
  }, [open, projectId, freshRestart]);

  const restart = useCallback(() => {
    const term = termRef.current;
    const socket = socketRef.current;
    if (!term) return;

    readyRef.current = false;
    setStatus("connecting");
    term.write("\r\n\x1b[2mRestarting terminal…\x1b[0m\r\n");
    if (socket?.connected) {
      socket.emit("terminal:start", {
        projectId,
        cols: term.cols,
        rows: term.rows,
        fresh: true,
      });
    } else {
      // Ask the next successful handshake to force a fresh session.
      freshRestart.current = true;
      socket?.connect();
    }
  }, [projectId]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragRef.current = { startY: event.clientY, startHeight: height };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.style.userSelect = "none";
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    // No lower clamp while dragging: the dock shrinks past its minimum so the
    // user can see it heading toward the close threshold.
    const next = drag.startHeight + drag.startY - event.clientY;
    setHeight(Math.round(Math.max(0, Math.min(next, maxDockHeight()))));
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    setDragging(false);
    document.body.style.userSelect = "";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (height <= CLOSE_DRAG_THRESHOLD) {
      // Released inside the close zone — dismiss the dock and restore the
      // height it had before the drag for the next open.
      setHeight(clampHeight(drag.startHeight));
      onClose();
      return;
    }
    setHeight(clampHeight(height));
  };

  if (!open) return null;

  return (
    <div
      className="shrink-0 border-t border-border bg-card"
      style={{ height, maxHeight: "100%" }}
    >
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
          <span
            className={cn(
              "h-0.5 w-9 rounded-full transition-colors duration-150",
              dragging && height <= CLOSE_DRAG_THRESHOLD
                ? "bg-red-500/80"
                : "bg-border group-hover:bg-muted-foreground/50",
            )}
          />
        </div>

        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-card/80 px-3 backdrop-blur-sm">
          <SquareTerminalIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Terminal</span>
          <StatusPill status={status} />
          <div className="flex-1" />

          <HeaderButton
            label="Clear terminal"
            onClick={() => termRef.current?.clear()}
          >
            <EraserIcon className="size-3.5" />
          </HeaderButton>
          <HeaderButton label="Restart terminal" onClick={restart}>
            <RotateCcwIcon className="size-3.5" />
          </HeaderButton>
          <HeaderButton label="Close terminal" onClick={onClose}>
            <XIcon className="size-3.5" />
          </HeaderButton>
        </div>

        <div className="terminal-surface relative min-h-0 min-w-0 flex-1 overflow-hidden bg-card">
          {/*
            No padding here: FitAddon subtracts only the `.xterm` element's
            padding, so the inset lives in globals.css. Padding on this box
            makes every fit overshoot and the grid keeps its old size.
          */}
          <div ref={containerRef} className="size-full" />
        </div>
      </div>
    </div>
  );
}
