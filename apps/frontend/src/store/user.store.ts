import { UserStore } from "@/lib/types/types";
import { create } from "zustand";

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  isLoading: true,

  setUser: (user) =>
    set({
      user,
      isLoading: false,
    }),

  finishLoading: () =>
    set({
      isLoading: false,
    }),
}));