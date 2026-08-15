import { ChevronRightIcon, CopyMinusIcon, FilePlusCornerIcon, FolderPlusIcon, RotateCw } from "lucide-react"
import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils"
import { CreateFileRequest, ProjectFileType } from "@/lib/api/apis/files/types";
import { useLoadProject } from "@/lib/hooks/projects/useLoadProject";
import { useCreateFile, useLoadFiles, useLoadFolderContent, useMoveFile, useReloadFiles, useFile } from "@/lib/hooks/file/useFiles";
import { Button } from "@/components/ui/button";
import { CreateInput } from "./create-input";
import { ScrollArea } from "../../ui/scroll-area"
import { Tree } from "./tree";
import { TreeItemWrapperSkeleton } from "./TreeItemWrapperSkeleton";
import { FileIcon, FolderIcon } from "@react-symbols/icons/utils";
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    useDroppable,
    type DragEndEvent,
    type DragStartEvent,
} from "@dnd-kit/core";
import {
    ROOT_DROP_ID,
    TreeDndContext,
    isDescendant,
    createTreeCollisionDetection,
} from "./tree-dnd";
import { useFilesStore } from "@/store/file.store";
import { toast } from "sonner";

const EMPTY_FILES: ProjectFileType[] = [];

const TreeRootDropZone = ({ children }: { children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: ROOT_DROP_ID,
        data: { type: "root" },
    });

    return (
        <div className="relative flex-1 w-full">
            <div
                ref={setNodeRef}
                className={cn(
                    "absolute inset-0 z-0 transition-colors duration-150",
                    isOver &&
                        "bg-foreground/5 outline-2 outline-dashed outline-offset-[-2px] outline-foreground/20 dark:bg-foreground/10",
                )}
            />
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};


export const FileExplorer = ({ projectId }: { projectId: string }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [collapseKey, setCollapseKey] = useState(0);
    const [creating, setCreating] = useState<"file" | "folder" | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const { createFile, loading: creatingFile } = useCreateFile();
    const { reload, loading: refreshing } = useReloadFiles();
    const { moveFile } = useMoveFile();
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor),
    );
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

    const allFiles = useFilesStore(
        (s) => s.files[projectId] ?? EMPTY_FILES,
    );

    const collisionDetection = useMemo(
        () => createTreeCollisionDetection(allFiles),
        [allFiles],
    );

    const activeItem = useFile(projectId, activeId);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(String(event.active.id));
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        if (!over) return;

        const sourceId = String(active.id);
        const targetId = String(over.id);
        if (targetId === sourceId) return;

        const allFiles = useFilesStore.getState().files[projectId] ?? [];
        const source = allFiles.find((f) => f.id === sourceId);
        if (!source) return;

        let parentId: string | null = null;

        if (targetId === ROOT_DROP_ID) {
            if (source.parentId === null) return;
            parentId = null;
        } else {
            const target = allFiles.find((f) => f.id === targetId);
            if (!target || target.type !== "folder") return;
            if (isDescendant(allFiles, sourceId, targetId)) return;
            if (source.parentId === target.id) return;
            parentId = target.id;
        }

        try {
            await moveFile(projectId, sourceId, parentId);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Move failed");
        }
    };

    const handleDragCancel = () => {
        setActiveId(null);
    };

    return (
        <div className="h-full min-w-0 bg-sidebar">
            <ScrollArea className="h-full **:data-[slot=scroll-area-viewport]:overflow-x-hidden">
                <div className="flex min-h-full w-full min-w-0 flex-col">
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
                        <TreeDndContext.Provider value={{ activeId }}>
                            <DndContext
                                sensors={sensors}
                                collisionDetection={collisionDetection}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                onDragCancel={handleDragCancel}
                            >
                                <TreeRootDropZone>
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
                                </TreeRootDropZone>

                                <DragOverlay
                                    dropAnimation={null}
                                >
                                    {activeItem && (
                                        <div className="flex h-5.5 items-center gap-1 rounded-md bg-popover/90 px-2 text-sm shadow-lg ring-1 ring-foreground/10 dark:bg-popover/90">
                                            {activeItem.type === "folder" ? (
                                                <FolderIcon
                                                    folderName={activeItem.name}
                                                    className="size-4 shrink-0"
                                                />
                                            ) : (
                                                <FileIcon
                                                    fileName={activeItem.name}
                                                    autoAssign
                                                    className="size-4 shrink-0"
                                                />
                                            )}
                                            <span className="truncate">{activeItem.name}</span>
                                        </div>
                                    )}
                                </DragOverlay>
                            </DndContext>
                        </TreeDndContext.Provider>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}