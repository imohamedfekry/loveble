"use client";

import { useEffect, useState } from "react";

/* ─────────────────────────────────────────────────────────
 * LOADING STATE — pixel-grid loader for long-running work
 *
 * Variants:
 *   Drive  — square cells, chevron wavefront driving right;
 *            the 650ms cycle is shorter than the sweep, so
 *            two fronts are always in flight
 *   Dots   — same wavefront, circular cells
 *   Orbit  — a comet lapping the grid perimeter
 *   Heart  — circular cells arranged as a heart, lit by a
 *            diagonal wavefront (used for the "thinking" state)
 *   Surfer — the Drive loader paired with a meme video below
 *
 * Paired with a shimmering label and a live elapsed timer
 * in mono tabular figures. Reduced motion freezes the grid
 * to its dim state; the timer still ticks.
 * ───────────────────────────────────────────────────────── */

const chevron = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3), c = i % 3;
  return (c + Math.abs(r - 1)) * 90;
});

const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
const orbit = Array.from({ length: 9 }, (_, i) => {
  const k = ORBIT_ORDER.indexOf(i);
  return k === -1 ? null : k * 110;
});

const HEART_COLS = 5;
// 1 = a lit cell, 0 = a dim cell (kept in the grid so the heart keeps its shape).
const HEART = [
  0, 1, 0, 1, 0,
  1, 1, 1, 1, 1,
  1, 1, 1, 1, 1,
  0, 1, 1, 1, 0,
  0, 0, 1, 0, 0,
];
const heart = HEART.map((on, i) =>
  on ? (Math.floor(i / HEART_COLS) + (i % HEART_COLS)) * 55 : null,
);

const PATTERNS: Record<
  string,
  {
    delays: (number | null)[];
    dur: number;
    round: boolean;
    cols: number;
    size: number;
    gap: number;
    /** Base opacity of a cell while its wavefront is not over it. */
    base: number;
    /** Opacity of a cell that never lights up (keeps the icon's silhouette). */
    dim: number;
    /** Clockwise tilt (deg) applied to the whole icon, e.g. a leaning heart. */
    rotate?: number;
  }
> = {
  Drive: { delays: chevron, dur: 650, round: false, cols: 3, size: 4, gap: 1.5, base: 0.15, dim: 0.07 },
  Dots: { delays: chevron, dur: 650, round: true, cols: 3, size: 4, gap: 1.5, base: 0.15, dim: 0.07 },
  Orbit: { delays: orbit, dur: 950, round: false, cols: 3, size: 4, gap: 1.5, base: 0.15, dim: 0.07 },
  // The Heart is the compact "thinking" loader: only the heart-shaped cells
  // show (the surrounding square is hidden), and the whole heart is rotated
  // 30° to match the brand mark.
  Heart: {
    delays: heart,
    dur: 650,
    round: true,
    cols: HEART_COLS,
    size: 2,
    gap: 1,
    base: 0.16,
    dim: 0,
    rotate: 45,
  },
};

function LoaderGrid({
  delays,
  dur,
  round,
  cols,
  size,
  gap,
  base,
  dim,
  rotate,
}: {
  delays: (number | null)[];
  dur: number;
  round: boolean;
  cols: number;
  size: number;
  gap: number;
  base: number;
  dim: number;
  rotate?: number;
}) {
  return (
    <span
      aria-hidden
      className="grid shrink-0"
      style={{
        gridTemplateColumns: `repeat(${cols}, ${size}px)`,
        gap: `${gap}px`,
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
        transformOrigin: "center center",
      }}
    >
      {delays.map((delay, index) => (
        <span
          key={index}
          className={`bg-ink ${round ? "rounded-full" : "rounded-[1px]"}`}
          style={{
            width: size,
            height: size,
            opacity: delay === null ? dim : base,
            animation: delay === null ? "none" : `pixel-on ${dur}ms ease-in-out ${delay}ms infinite`,
          }}
        />
      ))}
    </span>
  );
}

function useElapsed() {
  const [ds, setDs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDs((d) => d + 1), 100);
    return () => clearInterval(t);
  }, []);
  const total = ds / 10;
  if (total < 60) return `${total.toFixed(1)}s`;
  return `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`;
}

export default function LoadingState({
  label,
  variant = "Drive",
  videoSrc = "https://95dnc2a95qgwt9ff.public.blob.vercel-storage.com/subway-surfers-min.mp4",
}: {
  label?: string;
  variant?: string;
  videoSrc?: string;
}) {
  const elapsed = useElapsed();
  const surfer = variant === "Surfer";
  const resolvedLabel = label ?? (surfer ? "Subway surfing" : "Churning");
  const [videoOk, setVideoOk] = useState(true);
  const { delays, dur, round, cols, size, gap, base, dim, rotate } =
    PATTERNS[variant] ?? PATTERNS.Drive;

  const labelEl = (
    <span
      className="bg-clip-text text-[13px] font-medium text-transparent"
      style={{
        backgroundImage:
          "linear-gradient(90deg, var(--ink-3) 35%, var(--ink) 50%, var(--ink-3) 65%)",
        backgroundSize: "200% 100%",
        animation: "shimmer-text 1.4s linear infinite",
      }}
    >
      {resolvedLabel}
    </span>
  );
  const elapsedEl = <span className="font-mono text-[12px] text-ink-3 tabular-nums">{elapsed}</span>;

  if (surfer) {
    return (
      <div role="status" className="flex w-fit flex-col items-start">
        <div className="flex items-center gap-2.5">
          <LoaderGrid {...PATTERNS.Drive} />
          {labelEl}
          {elapsedEl}
        </div>

        <div
          className="mt-2 w-56 overflow-hidden rounded-[10px] shadow-overlay"
          style={{ animation: "pop-in 200ms cubic-bezier(0.16,1,0.3,1) both", transformOrigin: "top left" }}
        >
          <div className="relative aspect-video w-full" style={{ background: "var(--tooltip-bg)" }}>
            {videoOk ? (
              <video
                src={videoSrc}
                autoPlay
                muted
                loop
                playsInline
                onError={() => setVideoOk(false)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1.5">
                <LoaderGrid {...PATTERNS.Drive} />
                <span className="px-3 text-center font-mono text-[10px]" style={{ color: "var(--tooltip-muted)" }}>
                  Video unavailable
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const grid = (
    <LoaderGrid
      delays={delays}
      dur={dur}
      round={round}
      cols={cols}
      size={size}
      gap={gap}
      base={base}
      dim={dim}
      rotate={rotate}
    />
  );

  return (
    <div role="status" className="flex w-fit items-center gap-2.5">
      {grid}
      {labelEl}
      {elapsedEl}
    </div>
  );
}
