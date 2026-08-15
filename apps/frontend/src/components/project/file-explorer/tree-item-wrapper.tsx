import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { ProjectFileType } from "@/lib/api/apis/files/types";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
    ContextMenu,
    ContextMenuItem,
    ContextMenuContent,
    ContextMenuTrigger,
    ContextMenuShortcut,
    ContextMenuSeparator,
} from "@/components/ui/context-menu";

import { getItemPadding } from "./constants";
import { isValidDropTarget, useTreeDndContext } from "./tree-dnd";
import { useFilesStore } from "@/store/file.store";

const EMPTY_FILES: ProjectFileType[] = [];

type TreeItemWrapperProps = {
    item: ProjectFileType;
    children: ReactNode;
    level: number;
    projectId: string;
    isActive?: boolean;
    loading?: boolean;
    onClick?: () => void;
    onDoubleClick?: () => void;
    onRename?: () => void;
    onDelete?: () => void;
    onCreateFile?: () => void;
    onCreateFolder?: () => void;
};

export const TreeItemWrapper = ({
    item,
    children,
    level,
    projectId,
    isActive = false,
    loading = false,
    onClick,
    onDoubleClick,
    onRename,
    onDelete,
    onCreateFile,
    onCreateFolder,
}: TreeItemWrapperProps) => {
    const { activeId } = useTreeDndContext();
    const files = useFilesStore((s) => s.files[projectId] ?? EMPTY_FILES);

    const canDrop = isValidDropTarget(files, activeId, item.id);

    const {
        attributes,
        listeners,
        setNodeRef: setDragRef,
        isDragging,
    } = useDraggable({
        id: item.id,
        data: { item },
        disabled: loading,
    });

    const {
        setNodeRef: setDropRef,
        isOver,
    } = useDroppable({
        id: item.id,
        data: { type: item.type },
    });

    return (
        <div
            ref={setDropRef}
            className={cn(
                "w-full transition-colors duration-150",
                canDrop && isOver && "bg-foreground/10 dark:bg-foreground/15 ring-1 ring-inset ring-foreground/20 dark:ring-foreground/25",
            )}
        >
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <button
                        ref={setDragRef}
                        disabled={loading}
                        {...attributes}
                        {...listeners}
                        onClick={onClick}
                        onDoubleClick={onDoubleClick}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                onRename?.();
                            }
                        }}
                        className={cn(
                            "group flex h-5.5 w-full items-center gap-1 outline-none transition-colors duration-150 hover:bg-foreground/5 focus:ring-1 focus:ring-inset focus:ring-ring",
                            isActive && "bg-accent/70",
                            isDragging && "opacity-50",
                            loading && "cursor-progress opacity-70",
                        )}
                        style={{
                            paddingLeft: getItemPadding(level, item.type === "file"),
                        }}
                    >
                        {children}
                    </button>
                </ContextMenuTrigger>
                <ContextMenuContent
                    onCloseAutoFocus={(e) => e.preventDefault()}
                    className="w-64"
                >
                    {item.type === "folder" && (
                        <>
                            <ContextMenuItem onSelect={onCreateFile}>
                                New File...
                            </ContextMenuItem>
                            <ContextMenuItem onSelect={onCreateFolder}>
                                New Folder...
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                        </>
                    )}
                    <ContextMenuItem disabled={loading} onSelect={onRename}>
                        Rename
                        <ContextMenuShortcut>f2</ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuItem
                        disabled={loading}
                        variant="destructive"
                        onSelect={onDelete}
                    >
                        Delete Permanently
                        <ContextMenuShortcut>⌘Backspace</ContextMenuShortcut>
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        </div>
    );

};
