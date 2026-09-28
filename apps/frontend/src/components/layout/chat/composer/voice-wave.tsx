"use client";

import { useEffect, useRef } from "react";

export function VoiceWave({
  levelRef,
}: {
  levelRef: { current: number };
}) {
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;

    const tick = () => {
      const level = Math.max(0.05, Math.min(1, levelRef.current));

      for (let i = 0; i < barsRef.current.length; i++) {
        const bar = barsRef.current[i];
        if (!bar) continue;

        const wobble = 0.7 + 0.3 * Math.sin(performance.now() / 150 + i * 1.4);
        bar.style.height = `${4 + 10 * level * wobble}px`;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [levelRef]);

  return (
    <span className="flex h-3.5 items-center gap-0.5">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          ref={(element) => {
            barsRef.current[index] = element;
          }}
          className="w-0.5 rounded-full bg-current"
          style={{ height: "4px" }}
        />
      ))}
    </span>
  );
}
