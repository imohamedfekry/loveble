"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { animate } from "framer-motion";

/** How far the bump rises above the composer's top edge (px). */
export const BUMP_H = 24;
/** Horizontal run of one concave "shoulder" (foot → plateau). */
const SHOULDER = 23.572;
/** Space from each text edge to the foot of its shoulder. */
const TEXT_SIDE = 20;
/** Keeps the 1px stroke on the pixel grid. */
const INSET = 0.5;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function easeOut(t: number) {
  return 1 - (1 - t) ** 3;
}

const fmt = (x: number, y: number) => `${x.toFixed(2)} ${y.toFixed(2)}`;

/**
 * One bell-shaped shoulder, drawn from the foot (on the composer's top edge) to
 * the plateau. dir 1 = left shoulder (goes right/up), dir -1 = right shoulder
 * (drawn plateau → foot so the whole outline stays one clockwise path).
 */
function shoulder(
  footX: number,
  footY: number,
  platX: number,
  platY: number,
  dir: 1 | -1,
) {
  const xScale = Math.abs(platX - footX) / SHOULDER;
  const yScale = Math.max(0.001, (footY - platY) / 20);
  const at = (lx: number, ly: number) => ({
    x: footX + dir * lx * xScale,
    y: footY + (ly - 20) * yScale,
  });
  const c1 = { x: footX + dir * 5.398 * xScale, y: footY };
  const c2 = at(10.012, 16.114);
  const p1 = at(10.93, 10.794);
  const c3 = at(11.916, 4.577);
  const c4 = at(17.277, 0);
  if (dir === 1) {
    return `C${fmt(c1.x, c1.y)} ${fmt(c2.x, c2.y)} ${fmt(p1.x, p1.y)}C${fmt(c3.x, c3.y)} ${fmt(c4.x, c4.y)} ${fmt(platX, platY)}`;
  }
  return `C${fmt(c4.x, c4.y)} ${fmt(c3.x, c3.y)} ${fmt(p1.x, p1.y)}C${fmt(c2.x, c2.y)} ${fmt(c1.x, c1.y)} ${fmt(footX, footY)}`;
}

/** The composer's rounded rectangle with the bump grown out of its top edge. */
function outline(
  w: number,
  h: number,
  radius: number,
  open: number,
  cx: number,
  plateauW: number,
) {
  const left = INSET;
  const right = w - INSET;
  const top = BUMP_H + INSET;
  const bottom = BUMP_H + h - INSET;
  const r = Math.min(radius, (h - INSET * 2) / 2);
  const topL = cx - plateauW / 2;
  const topR = cx + plateauW / 2;
  const platY = INSET + BUMP_H * (1 - open);

  return [
    `M${left + r} ${top}`,
    `H${topL - SHOULDER}`,
    shoulder(topL - SHOULDER, top, topL, platY, 1),
    `H${topR}`,
    shoulder(topR + SHOULDER, top, topR, platY, -1),
    `H${right - r}`,
    `A${r} ${r} 0 0 1 ${right} ${top + r}`,
    `V${bottom - r}`,
    `A${r} ${r} 0 0 1 ${right - r} ${bottom}`,
    `H${left + r}`,
    `A${r} ${r} 0 0 1 ${left} ${bottom - r}`,
    `V${top + r}`,
    `A${r} ${r} 0 0 1 ${left + r} ${top}Z`,
  ].join("");
}

/**
 * Wraps the composer and draws ONE outline around it: the rounded rectangle
 * plus a bump (with a label) growing out of the top edge. The wrapped
 * composer's own surface is made transparent — this outline is its surface.
 */
export function ComposerBump({
  label,
  radius = 30,
  align = "center",
  show = true,
  highlight = false,
  className,
  children,
}: {
  label: ReactNode;
  /** Corner radius of the composer (30 for the pill, 24 for rounded-3xl). */
  radius?: number;
  align?: "start" | "center" | "end";
  show?: boolean;
  /** Tint the outline (e.g. while files are dragged over the composer). */
  highlight?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const openRef = useRef(0);
  const [open, setOpen] = useState(0);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [textW, setTextW] = useState(32);

  // Track the composer's size — it grows when the text wraps.
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const read = () => {
      const rect = el.getBoundingClientRect();
      setSize((prev) =>
        prev &&
        Math.abs(prev.w - rect.width) < 0.5 &&
        Math.abs(prev.h - rect.height) < 0.5
          ? prev
          : { w: rect.width, h: rect.height },
      );
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The plateau is sized from the real text width.
  const measured = size !== null;
  useLayoutEffect(() => {
    const w = textRef.current?.getBoundingClientRect().width ?? 0;
    if (w > 0 && Math.abs(w - textW) > 0.4) setTextW(w);
  }, [label, textW, measured]);

  // Grow / shrink the bump.
  useEffect(() => {
    const to = show ? 1 : 0;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      openRef.current = to;
      setOpen(to);
      return;
    }
    const controls = animate(openRef.current, to, {
      duration: 0.22,
      ease: [0.23, 1, 0.32, 1],
      onUpdate: (value) => {
        openRef.current = value;
        setOpen(value);
      },
    });
    return () => controls.stop();
  }, [show]);

  const plateauW = Math.max(8, textW + TEXT_SIDE * 2 - SHOULDER * 2);
  const reveal = easeOut(clamp((open - 0.45) / 0.55, 0, 1));

  let cx = 0;
  let d = "";
  if (size) {
    const r = Math.min(radius, size.h / 2);
    // The left foot must clear the corner arc, the right one likewise.
    const minCx = INSET + r + SHOULDER + plateauW / 2;
    const maxCx = size.w - minCx;
    const edge = minCx + 6;
    const wanted =
      align === "start" ? edge : align === "end" ? size.w - edge : size.w / 2;
    cx = clamp(wanted, minCx, Math.max(minCx, maxCx));
    d = outline(size.w, size.h, radius, open, cx, plateauW);
  }

  return (
    // Reserves the room the bump rises into, so nothing above gets covered.
    <div className={className} style={{ paddingTop: BUMP_H }}>
      <div
        ref={boxRef}
        className="relative isolate [&>*]:border-transparent! [&>*]:bg-transparent! [&>*]:shadow-none! [&>*]:ring-0!"
      >
        {size && (
          <svg
            aria-hidden
            className="pointer-events-none absolute -z-10 overflow-visible drop-shadow-sm"
            style={{ left: 0, top: -BUMP_H }}
            width={size.w}
            height={size.h + BUMP_H}
            viewBox={`0 0 ${size.w} ${size.h + BUMP_H}`}
            fill="none"
          >
            <path
              d={d}
              strokeWidth={1}
              strokeLinejoin="round"
              className={
                highlight
                  ? "fill-popover stroke-primary/40"
                  : "fill-popover stroke-border"
              }
            />
          </svg>
        )}

        {size && (
          <div
            className="pointer-events-none absolute flex items-center pb-0.5 text-xs font-medium whitespace-nowrap text-foreground"
            style={{
              left: cx,
              top: -BUMP_H,
              height: BUMP_H,
              transform: "translateX(-50%)",
              opacity: reveal,
              filter:
                reveal > 0.98
                  ? undefined
                  : `blur(${((1 - reveal) * 3).toFixed(2)}px)`,
            }}
          >
            <span ref={textRef}>{label}</span>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
