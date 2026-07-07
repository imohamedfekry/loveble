import { useEffect } from "react";
import { socket } from "../socket";
import { useProjectsStore } from "@/store/project.store";

export const useRealtimeProjects = () => {

  useEffect(() => {
    const onCreated = (project:any)=>{
      useProjectsStore.getState().addProject(project);
    };
    const onUpdated = (project:any)=>{
      useProjectsStore.getState().updateProject(project);
    };
    const onDeleted = ({id}: {id:string})=>{
      useProjectsStore.getState().removeProject(id);
    };
    socket.on("project:created",onCreated);
    socket.on("project:updated",onUpdated);
    socket.on("project:deleted",onDeleted);


    return ()=>{
      socket.off("project:created",onCreated);
      socket.off("project:updated",onUpdated);
      socket.off("project:deleted",onDeleted);

    };


  },[]);

};