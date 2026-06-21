"use client";

import { useEffect } from "react";
import { socket } from "@/lib/socket";
import { useProjectsStore } from "@/store/project.store";

export const useRealtimeProjects = () => {
  useEffect(() => {
    const onCreated = (project: any) => {
      useProjectsStore.getState().addProject(project);
    };

    const onUpdated = (project: any) => {
      useProjectsStore.getState().updateProject(project);
    };

    const onDeleted = ({ id }: { id: string }) => {
      useProjectsStore.getState().removeProject(id);
    };

    const onConnect = () => {
      console.log("socket connected", socket.id);
    };

    // سجل الـ listeners بغض النظر عن حالة الاتصال
    socket.on("connect", onConnect);
    socket.on("project:created", onCreated);
    socket.on("project:updated", onUpdated);
    socket.on("project:deleted", onDeleted);

    return () => {
      socket.off("connect", onConnect);
      socket.off("project:created", onCreated);
      socket.off("project:updated", onUpdated);
      socket.off("project:deleted", onDeleted);
    };
  }, []);
};
