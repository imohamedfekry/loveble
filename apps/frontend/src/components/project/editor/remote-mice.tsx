"use client";

import { useEffect, useState } from "react";
import { MousePointer2 } from "lucide-react";
import type { EditorView } from "@codemirror/view";
import type { RemotePeer } from "@/lib/socket/collab-protocol";

export function RemoteMice({
  peers,
  view,
}: {
  peers: RemotePeer[];
  view: EditorView | null;
}) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!view) return;
    const handler = () => setTick((t) => t + 1);
    view.scrollDOM.addEventListener("scroll", handler, { passive: true });
    return () => view.scrollDOM.removeEventListener("scroll", handler);
  }, [view]);

  if (!view) return null;

  const scrollerRect = view.scrollDOM.getBoundingClientRect();

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {peers.map((peer) => {
        if (!peer.mouse) return null;

        const docPos = Math.min(peer.mouse.docPos, view.state.doc.length);
        const coords = view.coordsAtPos(docPos);
        if (!coords) return null;

        const left = coords.left - scrollerRect.left;
        const top = coords.top - scrollerRect.top;

        return (
          <div
            key={peer.socketId}
            className="absolute -translate-x-px -translate-y-px transition-transform duration-75 ease-out"
            style={{
              left,
              top,
              color: peer.color,
            }}
          >
            <MousePointer2
              className="size-4"
              fill={peer.color}
              stroke="white"
              strokeWidth={1.25}
            />
            <span
              className="mt-0.5 ml-2 inline-block max-w-32 truncate rounded-sm px-1 py-px text-[10px] font-medium text-foreground"
              style={{ backgroundColor: peer.color }}
            >
              {peer.displayName || peer.userName}
            </span>
          </div>
        );
      })}
    </div>
  );
}
