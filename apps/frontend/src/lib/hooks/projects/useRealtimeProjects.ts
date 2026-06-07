"use client";

import { useEffect } from "react";
import { socket } from "@/lib/socket";
import { useProjectsStore } from "@/store/project.store";

export const useRealtimeProjects = () => {
  const addProject = useProjectsStore((s) => s.addProject);
  const updateProject = useProjectsStore((s) => s.updateProject);
  const removeProject = useProjectsStore((s) => s.removeProject);

  useEffect(() => {
    const onConnect = () => {
      console.log("socket connected", socket.id);
    };

    const onDeleted = ({ id }: { id: string }) => {
      removeProject(id);
    };

    socket.on("connect", onConnect);
    socket.on("project:created", addProject);
    socket.on("project:updated", updateProject);
    socket.on("project:deleted", onDeleted);

    return () => {
      socket.off("connect", onConnect);
      socket.off("project:created", addProject);
      socket.off("project:updated", updateProject);
      socket.off("project:deleted", onDeleted);
    };
  }, [addProject, updateProject, removeProject]);
};
