import { io } from "socket.io-client";

export const socket = io("ws://localhost:3001/realtime"!, {
  autoConnect: false,
  transports: ["websocket"],
  withCredentials: true,
});
