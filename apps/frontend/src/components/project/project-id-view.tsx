"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { FaGithub } from "react-icons/fa";
import { Allotment } from "allotment";
import { FileExplorer } from "./file-explorer";
import { EditorView } from "./editor/editor-view";

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 800;
const DEFAULT_SIDEBAR_WIDTH = 350;
const DEFAULT_MAIN_SIZE = 1000;

const Tab = ({
    lable,
    isActive,
    onClick
}: {
    lable: string;
    isActive: boolean;
    onClick: () => void
}) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex h-full items-center gap-2 border-r px-3 text-muted-foreground transition-colors hover:bg-accent/30 active:scale-[0.96]",
                isActive && "bg-background text-foreground",
            )}
        >
            <span className="text-sm text-pretty">{lable}</span>
        </button>
    );
};

export const ProjectIdView = ({ projectId }: { projectId: string }) => {
    const [activeView, setActiveView] = useState<"editor" | "preview">("editor");

    return (
        <div className="flex h-full flex-col">
            <nav className="flex h-8.75 items-center border-b bg-sidebar">
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
                <div className="flex h-full flex-1 justify-end">
                    <button
                        type="button"
                        className="flex h-full items-center gap-1.5 border-l px-3 text-muted-foreground transition-colors hover:bg-accent/30 active:scale-[0.96]"
                    >
                        <FaGithub className="size-3.5" />
                        <span className="text-sm">Export</span>
                    </button>
                </div>
            </nav>
            <div className="relative flex-1">
                <div className={cn(
                    "absolute inset-0",
                    activeView === "editor" ? "visible" : "invisible",
                )}>
                    <Allotment defaultSizes={[DEFAULT_SIDEBAR_WIDTH, DEFAULT_MAIN_SIZE]}>
                        <Allotment.Pane
                            snap
                            minSize={MIN_SIDEBAR_WIDTH}
                            maxSize={MAX_SIDEBAR_WIDTH}
                            preferredSize={DEFAULT_SIDEBAR_WIDTH}
                        >
                            <FileExplorer projectId={projectId} />
                        </Allotment.Pane>

                        <Allotment.Pane>
                            <EditorView projectId={projectId}  />                     
                        </Allotment.Pane>
                    </Allotment>
                </div>

                <div className={cn(
                    "absolute inset-0",
                    activeView === "preview" ? "visible" : "invisible",
                )}>
                    <div className="p-4 text-sm text-muted-foreground">
                        preview : {projectId}
                    </div>
                </div>
            </div>
        </div>
    );
};
