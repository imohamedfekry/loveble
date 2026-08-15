"use client";

import { useEffect } from "react";
import { socket } from "./socket";
import { useSocketStore } from "./socket-store";

export function SocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log("[SocketProvider] render");

  useEffect(() => {
    console.log(
      "[SocketProvider] first effect",
      "connected:",
      socket.connected,
      "id:",
      socket.id,
    );

    if (socket.connected) {
      useSocketStore.getState().setStatus("connected");
    }
  }, []);

  useEffect(() => {
    console.log("[SocketProvider] second effect");

    const { setStatus } = useSocketStore.getState();

    const onConnect = () => {
      console.log(
        "[socket] CONNECT",
        "id:",
        socket.id,
        "connected:",
        socket.connected,
      );

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

    console.log(
      "[SocketProvider] before connect",
      "connected:",
      socket.connected,
      "active:",
      socket.active,
      "id:",
      socket.id,
    );

    if (socket.connected) {
      console.log("[SocketProvider] already connected");
      setStatus("connected");
    } else {
      console.log("[SocketProvider] calling socket.connect()");
      setStatus("connecting");
      socket.connect();
    }

    console.log(
      "[SocketProvider] after connect()",
      "connected:",
      socket.connected,
      "active:",
      socket.active,
      "id:",
      socket.id,
    );

    return () => {
      console.log("[SocketProvider] cleanup");

      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
    };
  }, []);

  return children;
}