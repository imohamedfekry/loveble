"use client";

import { useEffect } from "react";
import { socket } from "./socket";
import { useSocketStore } from "./socket-store";

export function SocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const { setStatus } = useSocketStore.getState();

    const onConnect = () => {
      setStatus("connected");
    };

    const onDisconnect = () => {
      setStatus("disconnected");
    };

    const onConnectError = () => {
      setStatus("disconnected");
    };

    if (socket.connected) {
      setStatus("connected");
    } else {
      setStatus("connecting");
      socket.connect();
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
    };
  }, []);

  return children;
}
