import { create } from "zustand";

export type SocketStatus = "disconnected" | "connecting" | "connected";

type SocketStore = {
  status: SocketStatus;
  setStatus: (status: SocketStatus) => void;
};

export const useSocketStore = create<SocketStore>((set) => ({
  status: "disconnected",
  setStatus: (status) => set({ status }),
}));

export const useSocketStatus = () => useSocketStore((s) => s.status);

export const useIsSocketReady = () =>
  useSocketStore((s) => s.status !== "connecting");
