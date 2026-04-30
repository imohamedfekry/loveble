import { io } from "socket.io-client";

export const socket = io("http://localhost:3001/realtime", {
  transports: ["websocket"],
  auth: {
    token: typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null,
  },
});