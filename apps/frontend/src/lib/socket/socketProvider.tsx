"use client";

import { useEffect, useRef } from "react";
import { socket } from "./socket";
import { useSocketStore } from "./socket-store";

export function SocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const connectRef = useRef(false);

  useEffect(() => {
    const { setStatus } = useSocketStore.getState();

    const onConnect = () => {
      console.log("[socket] CONNECT", "id:", socket.id);
      setStatus("connected");
    };

    const onDisconnect = (reason: string) => {
      console.log("[socket] DISCONNECT", reason);
      setStatus("disconnected");
    };

    const onConnectError = (err: unknown) => {
      console.error("[socket] CONNECT ERROR", err);
      setStatus("disconnected");
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    if (!connectRef.current && !socket.connected) {
      connectRef.current = true;
      setStatus("connecting");
      socket.connect();
    } else if (socket.connected) {
      setStatus("connected");
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
    };
  }, []);

  return children;
}