"use client";

import { useEffect, useRef, useState } from "react";

/** Zoom factor to crop the SVG heart gradient to fill the panel edge-to-edge. */
const PULSE_ZOOM = 4.1;

const SVG_WIDTH = 1200;
const SVG_HEIGHT = 1210;

/**
 * Renders pulse.svg once to a bitmap canvas, then displays it with a static
 * CSS scale. Avoids re-rasterizing SVG filters on every layout change (sidebar
 * open/close) and fixes Firefox height issues from percentage + transform hacks.
 */
export function PulseBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = "/pulse.svg";

    img.onload = () => {
      canvas.width = SVG_WIDTH;
      canvas.height = SVG_HEIGHT;
      ctx.drawImage(img, 0, 0, SVG_WIDTH, SVG_HEIGHT);
      setReady(true);
    };
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ contain: "strict" }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className={`
          absolute
          left-1/2
          top-full
          h-full
          w-full
          max-w-none
          transition-opacity
          duration-[2s]
          ${ready ? "opacity-100" : "opacity-0"}
        `}
        style={{
          transform: `translate(-50%, -50%) scale(${PULSE_ZOOM}) translateZ(0)`,
          transformOrigin: "center center",
        }}
      />
    </div>
  );
}
