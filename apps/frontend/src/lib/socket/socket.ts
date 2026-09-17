import { io } from "socket.io-client";

const WS_BASE_URL =
  (process.env.NEXT_PUBLIC_WS_URL as string | undefined) ??
  "ws://localhost:3001/realtime";

export const socket = io(WS_BASE_URL, {
  autoConnect: false,
  transports: ["websocket"],
  withCredentials: true,
});