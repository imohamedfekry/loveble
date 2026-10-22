import { io } from "socket.io-client";

export const WS_BASE_URL =
  (process.env.NEXT_PUBLIC_WS_URL as string | undefined) ??
  "wss://api.loveble.localhost/realtime";

/** Interactive shell gateway (separate namespace, same server + auth cookie). */
export const TERMINAL_WS_URL = WS_BASE_URL.replace(/\/realtime\/?$/, "/terminal");

export const socket = io(WS_BASE_URL, {
  autoConnect: false,
  transports: ["websocket"],
  withCredentials: true,
});