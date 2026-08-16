import { useEffect } from "react";
import { socket } from "../socket";
import { useProjectsStore } from "@/store/project.store";
import type { Project } from "@/lib/types/types";

export const useRealtimeProjects = () => {
  useEffect(() => {
    const onCreated = (project: Project) => {
      useProjectsStore.getState().addProject(project);
    };

    const onUpdated = (project: Project) => {
      console.log("projectttt updated", project);

      useProjectsStore.getState().updateProject(project);
    };

    const onDeleted = ({ id }: { id: string }) => {
      useProjectsStore.getState().removeProject(id);
    };

    const register = () => {
      socket.on("project:created", onCreated);
      socket.on("project:updated", onUpdated);
      socket.on("project:deleted", onDeleted);
    };

    const unregister = () => {
      socket.off("project:created", onCreated);
      socket.off("project:updated", onUpdated);
      socket.off("project:deleted", onDeleted);
    };

    if (socket.connected) {
      register();
    }

    const onConnect = () => register();

    socket.on("connect", onConnect);

    return () => {
      socket.off("connect", onConnect);
      unregister();
    };
  }, []);
};
