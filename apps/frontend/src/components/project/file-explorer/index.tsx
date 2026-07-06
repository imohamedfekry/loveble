import { ChevronRightIcon, CopyMinusIcon, FileIcon, FilePlusCornerIcon, FolderPlusIcon, RotateCw } from "lucide-react"
import React, { useState } from "react";
import { cn } from "@/lib/utils"
import { CreateFileRequest } from "@/lib/api/apis/files/types";
import { useLoadProject } from "@/lib/hooks/projects/useLoadProject";
import { createFile } from "@/lib/api/apis/files/files";
import { useLoadFiles, useLoadFolderContent } from "@/lib/hooks/file/useFiles";
import { Button } from "@/components/ui/button";
import { CreateInput } from "./create-input";
import { ScrollArea } from "../../ui/scroll-area"
import { Tree } from "./tree";
import { TreeItemWrapperSkeleton } from "./TreeItemWrapperSkeleton";
export const FileExplorer = ({ projectId }: { projectId: string }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [collapseKey, setCollapseKey] = useState(0);
    const [creating, setCreating] = useState<"file" | "folder" | null>(null);
    const handleCreateFile = (data: CreateFileRequest) => {
        setCreating(null);
        createFile(projectId, data);
    };
    const { project, loading } = useLoadProject(projectId);

    useLoadFiles(projectId, isOpen);

    const { files, loading: filesLoading } = useLoadFolderContent(
        projectId,
        null,
        isOpen,
    );

    return (
        <div className="h-full min-w-0 bg-sidebar">
            <ScrollArea className="h-full **:data-[slot=scroll-area-viewport]:overflow-x-hidden">
                <div className="w-full min-w-0">
                    <div
                        role="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="group/project cursor-pointer w-full min-w-0 text-left flex items-center gap-0.5 h-5.5 bg-accent font-bold"
                    >
                        <ChevronRightIcon
                            className={cn(
                                "size-4 shrink-0 text-muted-foreground ", isOpen && "rotate-90"
                            )}
                        />
                        <p className="min-w-0 flex-1 text-xs uppercase line-clamp-1">
                            {project?.name ||
                                (loading
                                    ? "Loading..."
                                    : "Unknown project")}
                        </p>
                        <div className="shrink-0 opacity-0 group-hover/project:opacity-100 transition-none duration-0 flex items-center gap-0.5 ml-auto">
                            <Button
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setCreating("file")
                                    setIsOpen(true);


                                }}
                                variant="highlight"
                                size="icon-xs"
                            >
                                <FilePlusCornerIcon className="size-3.5" />

                            </Button>
                            <Button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setIsOpen(true)
                                    setCreating("folder")
                                }}
                                variant="highlight"
                                size="icon-xs"
                            >
                                <FolderPlusIcon className="size-3.5" />

                            </Button>


                            <Button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setCollapseKey((prev) => prev + 1);
                                }}
                                variant="highlight"
                                size="icon-xs"
                            >
                                <CopyMinusIcon className="size-3.5" />

                            </Button>

                            <Button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    // Refresh the file explorer
                                }}
                                variant="highlight"
                                size="icon-xs"
                            >
                                <RotateCw className="size-3.5" />

                            </Button>

                        </div>
                    </div>
                    {isOpen && (
                        <>
                            {loading &&
                                Array.from({ length: 4 }).map((_, index) => (
                                    <TreeItemWrapperSkeleton
                                        key={index}
                                        level={0}
                                    />
                                ))}
                            {creating && (
                                <CreateInput
                                    type={creating}
                                    level={0}
                                    onSubmit={handleCreateFile}
                                    onCancel={() => setCreating(null)}
                                />

                            )}
                            {files.map((item) => (
            
                                    <Tree
                                        key={`${item.id}-${collapseKey}`}
                                        item={item}
                                        level={0}
                                        projectId={projectId}
                                    />

                            ))}
                        </>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}