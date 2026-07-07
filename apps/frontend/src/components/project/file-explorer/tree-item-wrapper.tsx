import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { ProjectFileType } from "@/lib/api/apis/files/types";
import {
    ContextMenu,
    ContextMenuItem,
    ContextMenuContent,
    ContextMenuTrigger,
    ContextMenuShortcut,
    ContextMenuSeparator,
} from "@/components/ui/context-menu";

import { getItemPadding } from "./constants";

type TreeItemWrapperProps = {
    item: ProjectFileType;
    children: ReactNode;
    level: number;
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
    isActive = false,
    loading = false,
    onClick,
    onDoubleClick,
    onRename,
    onDelete,
    onCreateFile,
    onCreateFolder,
}: TreeItemWrapperProps) => {

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <button
                    disabled={loading}
                    onClick={onClick}
                    onDoubleClick={onDoubleClick}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            onRename?.();
                        }
                    }}
                    className={cn(
                        "group flex h-5.5 w-full items-center gap-1 outline-none transition-opacity duration-200 hover:bg-accent/30 focus:ring-1 focus:ring-inset focus:ring-ring",
                        isActive && "bg-accent/30",
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
    );
};
