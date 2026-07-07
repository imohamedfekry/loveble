"use client";

import { useEffect } from "react";
import { socket } from "./socket";

export function SocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  useEffect(() => {

    if (!socket.connected) {
      socket.connect();
    }


    const onConnect = () => {
      console.log("Socket connected:", socket.id);
    };


    const onDisconnect = () => {
      console.log("Socket disconnected");
    };


    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);


    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);

      socket.disconnect();
    };

  }, []);


  return children;
}