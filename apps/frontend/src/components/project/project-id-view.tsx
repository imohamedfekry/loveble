"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { FaGithub } from "react-icons/fa";

const Tab = ({
    lable,
    isActive,
    onClick
}: {
    lable: string;
    isActive: boolean;
    onClick: () => void
}) => {
    return <div
        onClick={onClick}
        className={cn(

            "flex items-center gap-2 h-full px-3 cursor-pointer text-muted-foreground border-r hover:bg-accent/30 ", isActive && "bg-background text-foreground "
        )}
    >
        <span className="text-sm">{lable}</span>
    </div>
}
export const ProjectIdView = ({ projectId }: { projectId: string }) => {
    const [activeView, setActiveView] = useState<"editor" | "preview">("editor");
    return (
        <div className="h-full flex flex-col ">
            <nav className="h-8.75 flex items-center bg-sidebar border-b">
                <Tab
                    lable="Code"
                    isActive={activeView === "editor"}
                    onClick={() => { setActiveView("editor") }}
                />
                <Tab
                    lable="Preview"
                    isActive={activeView === "preview"}
                    onClick={() => { setActiveView("preview") }}
                />
                <div className="flex-1 flex justify-end h-full ">
                    <div className="flex items-center gap-1.5 h-full px-3 cursor-pointer text-muted-foreground border-l hover:bg-accent/30">
                    <FaGithub className="size3.5" />
                    <span className="text-sm">
                        Export
                    </span>
                    </div>
                </div>
            </nav>
            <div className="flex-1 relative">
                <div className={cn
                    ("absolute inset-0",
                        activeView === "editor" ? "visible" : "invisible"
                    )}>

                    <div>
                        editor
                    </div>
                </div>

                <div className={cn
                    ("absolute inset-0",
                        activeView === "preview" ? "visible" : "invisible"
                    )}>
                    <div>
                        preview
                    </div>
                </div>
            </div>
            {/* project id: {projectId} */}
        </div>
    )
}