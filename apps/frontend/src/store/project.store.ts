import { Project } from "@loveble/types";
import { create } from "zustand";

type Store = {
  projects: Project[];
  loading: boolean;
  hasLoadedRecent: boolean;
  hasLoadedAll: boolean;

  setProjects: (projects: Project[]) => void;
  setLoading: (v: boolean) => void;
  markLoadedRecent: () => void;
  markLoadedAll: () => void;
  resetProjects: () => void;

  addProject: (p: Project) => void;
  updateProject: (p: Project) => void;
  removeProject: (id: string) => void;
};


export const useProjectsStore = create<Store>((set) => ({
  projects: [],
  loading: true,
  hasLoadedRecent: false,
  hasLoadedAll: false,

  setLoading: (loading) => set({ loading }),

  setProjects: (projects) =>
    set({
      projects: Array.isArray(projects) ? projects : [],
    }),

  markLoadedRecent: () => set({ hasLoadedRecent: true }),
  markLoadedAll: () =>
    set({ hasLoadedAll: true, hasLoadedRecent: true }),

  resetProjects: () =>
    set({
      projects: [],
      loading: true,
      hasLoadedRecent: false,
      hasLoadedAll: false,
    }),

  addProject: (project) =>
    set((state) => ({
      projects: [project, ...(state.projects ?? []).filter((p) => p.id !== project.id)],
    })),

  updateProject: (updated) =>
    set((state) => {
      const list = state.projects ?? [];
      if (!list.some((p) => p.id === updated.id)) {
        return { projects: [updated, ...list] };
      }
      return {
        projects: list.map((p) => (p.id === updated.id ? updated : p)),
      };
    }),

  removeProject: (id) =>
    set((state) => ({
      projects: (state.projects ?? []).filter((p) => p.id !== id),
    })),
}));