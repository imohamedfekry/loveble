import { io } from "socket.io-client";

export const socket = io("ws://localhost:3001/realtime"!, {
  transports: ["websocket"],
  withCredentials: true,
});