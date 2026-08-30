"use client";

import { MousePointer2 } from "lucide-react";
import type { RemotePeer } from "@/lib/socket/collab-protocol";

export function RemoteMice({ peers }: { peers: RemotePeer[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {peers.map((peer) => {
        if (!peer.mouse) return null;

        const x = Math.min(1, Math.max(0, peer.mouse.x));
        const y = Math.min(1, Math.max(0, peer.mouse.y));

        return (
          <div
            key={peer.socketId}
            className="absolute -translate-x-px -translate-y-px transition-transform duration-75 ease-out"
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              color: peer.color,
            }}
          >
            <MousePointer2
              className="size-4 drop-shadow-sm"
              fill={peer.color}
              stroke="white"
              strokeWidth={1.25}
            />
            <span
              className="mt-0.5 ml-2 inline-block max-w-32 truncate rounded-sm px-1 py-px text-[10px] font-medium text-white shadow-sm"
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
