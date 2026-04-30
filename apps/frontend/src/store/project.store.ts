import { Project } from "@/lib/types/types";
import { create } from "zustand";

type Store = {
  projects: Project[];
  loading: boolean;

  setProjects: (projects: Project[]) => void;
  setLoading: (v: boolean) => void;

  addProject: (p: Project) => void;
  updateProject: (p: Project) => void;
  removeProject: (id: string) => void;
};


export const useProjectsStore = create<Store>((set) => ({
  projects: [],
  loading: false,

  setLoading: (loading) => set({ loading }),

  setProjects: (projects) =>
    set({
      projects: Array.isArray(projects) ? projects : [],
    }),

  addProject: (project) =>
    set((state) => ({
      projects: [project, ...(state.projects ?? [])],
    })),

  updateProject: (updated) =>
    set((state) => ({
      projects: (state.projects ?? []).map((p) =>
        p.id === updated.id ? updated : p
      ),
    })),

  removeProject: (id) =>
    set((state) => ({
      projects: (state.projects ?? []).filter((p) => p.id !== id),
    })),
}));