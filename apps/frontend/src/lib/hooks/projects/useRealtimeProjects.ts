import { useEffect } from "react";
import { socket } from "@/lib/socket";
import { useProjectsStore } from "@/store/project.store";

export const useRealtimeProjects = () => {
  const { addProject, updateProject, removeProject } =
    useProjectsStore();

  useEffect(() => {
    socket.on("connect", () => {
      console.log("socket connected", socket.id);
    });

    // 🔥 create
    socket.on("project:created", (project) => {
      addProject(project);
    });

    // 🔥 update
    socket.on("project:updated", (project) => {
      updateProject(project);
    });

    // 🔥 delete
    socket.on("project:deleted", ({ id }) => {
      removeProject(id);
    });

    return () => {
      socket.off("project:created");
      socket.off("project:updated");
      socket.off("project:deleted");
    };
  }, []);
};