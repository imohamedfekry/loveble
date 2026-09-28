"use client";

import { cn } from "@loveble/utils";
import { useState } from "react";
import { FaGithub } from "react-icons/fa";
import { Allotment } from "allotment";
import Image from "next/image";
import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react";
import { FileExplorer } from "./file-explorer";
import { EditorView } from "./editor/editor-view";
import { useEditorStore } from "@/store/use-editor-store";
import { ensureSandbox } from "@/lib/hooks/projects/useLoadProject";

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
                "relative flex h-full items-center gap-2 border-r border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground active:scale-[0.96]",
                isActive &&
                    "bg-background text-foreground after:absolute after:inset-x-0 after:top-0 after:h-0.5 after:bg-primary",
            )}
        >
            <span className="text-sm text-pretty">{lable}</span>
        </button>
    );
};

const SandboxStarting = () => {
    return (
        <div className="relative size-full flex flex-col items-center justify-center gap-4 overflow-hidden bg-muted">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <Image
                    src="/logo.svg"
                    alt=""
                    width={140}
                    height={140}
                    loading="eager"
                    className="opacity-10"
                />
            </div>

            <div className="relative size-7 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />

            <div className="relative flex flex-col items-center gap-1 text-center">
                <span className="text-sm font-medium text-foreground/80">
                    Starting environment...
                </span>
                <span className="text-xs text-foreground/50">
                    Provisioning your sandbox — this takes a few seconds
                </span>
            </div>
        </div>
    );
};

const SandboxError = ({
    projectId,
    message,
}: {
    projectId: string;
    message: string;
}) => {
    const [retrying, setRetrying] = useState(false);

    const retry = async () => {
        console.log(`[sandbox] project ${projectId}: retry requested`);
        setRetrying(true);
        try {
            await ensureSandbox(projectId);
        } finally {
            setRetrying(false);
        }
    };

    return (
        <div className="size-full flex flex-col items-center justify-center gap-4 bg-muted px-6 text-center">
            <div className="grid size-10 place-items-center rounded-full bg-destructive/10">
                <TriangleAlertIcon className="size-5 text-destructive" />
            </div>

            <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-medium text-foreground">
                    Environment failed to start
                </span>
                <span className="max-w-md text-xs text-foreground/50">
                    {message}
                </span>
            </div>

            <button
                type="button"
                onClick={retry}
                disabled={retrying}
                className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm text-foreground transition-colors hover:bg-foreground/5 active:scale-[0.97] disabled:opacity-60"
            >
                <RotateCcwIcon className={cn("size-3.5", retrying && "animate-spin")} />
                <span>{retrying ? "Retrying..." : "Retry"}</span>
            </button>
        </div>
    );
};

export const ProjectIdView = ({ projectId }: { projectId: string }) => {
    const [activeView, setActiveView] = useState<"editor" | "preview">("editor");
    const sandboxState = useEditorStore((s) => s.getSandboxState(projectId));

    const renderEditorPane = () => {
        if (sandboxState.status === "starting") {
            return <SandboxStarting />;
        }

        if (sandboxState.status === "error") {
            return (
                <SandboxError
                    projectId={projectId}
                    message={sandboxState.error ?? "Something went wrong"}
                />
            );
        }

        return <EditorView projectId={projectId} />;
    };

    return (
        <div className="flex h-full flex-col">
            <nav className="flex h-8.75 items-center border-b border-border bg-card">
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
                        className="flex h-full items-center gap-1.5 border-l border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground active:scale-[0.96]"
                    >
                        <FaGithub className="size-3.5" />
                        <span className="text-sm">Export</span>
                    </button>
                </div>
            </nav>
            <div className="relative flex-1 bg-card ">
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
                            {renderEditorPane()}
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
