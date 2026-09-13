import { UserStore } from "@loveble/types";
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

// Module-level flag: true once /user/@me has resolved successfully.
// Checked synchronously inside the hook so remounts never refetch.
let hasLoadedUser = false;

export const isUserLoaded = () => hasLoadedUser;
export const markUserLoaded = () => {
  hasLoadedUser = true;
};
export const resetUserLoaded = () => {
  hasLoadedUser = false;
};