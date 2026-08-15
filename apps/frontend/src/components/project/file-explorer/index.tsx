import { ChevronRightIcon, CopyMinusIcon, FilePlusCornerIcon, FolderPlusIcon, RotateCw } from "lucide-react"
import React, { useState } from "react";
import { cn } from "@/lib/utils"
import { CreateFileRequest } from "@/lib/api/apis/files/types";
import { useLoadProject } from "@/lib/hooks/projects/useLoadProject";
import { useCreateFile, useLoadFiles, useLoadFolderContent, useReloadFiles } from "@/lib/hooks/file/useFiles";
import { Button } from "@/components/ui/button";
import { CreateInput } from "./create-input";
import { ScrollArea } from "../../ui/scroll-area"
import { Tree } from "./tree";
import { TreeItemWrapperSkeleton } from "./TreeItemWrapperSkeleton";
export const FileExplorer = ({ projectId }: { projectId: string }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [collapseKey, setCollapseKey] = useState(0);
    const [creating, setCreating] = useState<"file" | "folder" | null>(null);
    const { createFile, loading: creatingFile } = useCreateFile();
    const { reload, loading: refreshing } = useReloadFiles();
    const handleCreateFile = async (data: CreateFileRequest) => {
        setIsOpen(true);
        await createFile(projectId, data);
        setCreating(null);
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
                        className="group/project cursor-pointer w-full min-w-0 text-left flex items-center gap-0.5 h-5.5 bg-accent transition-colors hover:bg-foreground/5"
                    >
                        <ChevronRightIcon
                            className={cn(
                                "size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90"
                            )}
                        />
                        <p className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground line-clamp-1 transition-colors group-hover/project:text-foreground">
                            {project?.name ||
                                (loading
                                    ? "Loading..."
                                    : "Unknown project")}
                        </p>
                        <div className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover/project:opacity-100">
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
                                disabled={refreshing}
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    await reload(projectId);
                                    setCollapseKey((prev) => prev + 1);
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
                            {(loading || filesLoading) &&
                                Array.from({ length: 4 }).map((_, index) => (
                                    <TreeItemWrapperSkeleton
                                        key={index}
                                        level={0}
                                    />
                                ))}
                            {!loading && !filesLoading && creating && (
                                <CreateInput
                                    type={creating}
                                    level={0}
                                    loading={creatingFile}
                                    onSubmit={handleCreateFile}
                                    onCancel={() => setCreating(null)}
                                />

                            )}
                            {!loading && !filesLoading && files.map((item) => (
            
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