import { create } from "zustand";

interface ConnectorsStore {
  isOpen: boolean;
  openConnectors: () => void;
  closeConnectors: () => void;
  toggleConnectors: () => void;
}

export const useConnectorsStore = create<ConnectorsStore>((set) => ({
  isOpen: false,
  openConnectors: () => set({ isOpen: true }),
  closeConnectors: () => set({ isOpen: false }),
  toggleConnectors: () => set((s) => ({ isOpen: !s.isOpen })),
}));
