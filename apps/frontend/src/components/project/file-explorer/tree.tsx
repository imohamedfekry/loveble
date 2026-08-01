import { useState } from "react";
import { ChevronRightIcon } from "lucide-react";
import { FileIcon, FolderIcon } from "@react-symbols/icons/utils";
import { cn } from "@/lib/utils";
import type { CreateFileRequest, ProjectFileType, UpdateFile } from "@/lib/api/apis/files/types";
import { CreateInput } from "./create-input";
import {
    useCreateFile,
    useDeleteFile,
    useLoadFolderContent,
    useUpdateFile,
} from "@/lib/hooks/file/useFiles";
import { TreeItemWrapper } from "./tree-item-wrapper";
import { RenameInput } from "./rename-input";
import { TreeItemWrapperSkeleton } from "./TreeItemWrapperSkeleton";
import { useEditor } from "@/lib/hooks/use-editor";
export const Tree = ({
    item,
    level = 0,
    projectId,
}: {
    item: ProjectFileType;
    level?: number;
    projectId: string;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [creating, setCreating] = useState<"file" | "folder" | null>(null);
    const [isRenaming, setIsRenaming] = useState(false);
    const { updateFile, loading: renaming } = useUpdateFile();
    const { createFile, loading: creatingFile } = useCreateFile();
    const { deleteFile, loading: deleting } = useDeleteFile();
    const { openFile, closeTab, activeTabId } = useEditor(projectId)
    const filename = item.name
    const { files: children, loading } = useLoadFolderContent(
        projectId,
        item.id,
        isOpen && item.type === "folder",
    );
    const handleRename = async (data: UpdateFile) => {
        if (data.name === filename) {
            setIsRenaming(false);
            return;
        }

        await updateFile(projectId, item.id, data);
        setIsRenaming(false);
    };

    const handleCreate = async (data: CreateFileRequest) => {
        setIsOpen(true);

        await createFile(projectId, { ...data, parentId: item.id });
        setCreating(null);
    };

    const handleDelete = async () => {
        try {
            await deleteFile(projectId, item.id);
        } catch (err) {
            console.log("Delete failed", err);
        }
    };

    if (item.type === "file") {
        const isActive = activeTabId === item.id
        if (isRenaming) {
            return <RenameInput
                type="file"
                isOpen={true}
                loading={renaming}
                defaultValue={filename}
                level={level}
                onSubmit={handleRename}
                onCancel={() => setIsRenaming(false)}
            />
        }
        return (
            <TreeItemWrapper
                item={item}
                level={level}
                isActive={isActive}
                loading={deleting}
                onClick={() => openFile(item.id, { pinned: false })}
                onDoubleClick={() => openFile(item.id, { pinned: true })}
                onDelete={() => {
                    closeTab(item.id)
                    void handleDelete();
                }}
                onRename={() => setIsRenaming(true)}
            >
                <FileIcon fileName={filename} autoAssign className="size-4 shrink-0" />
                <span className="truncate text-sm">{filename}</span>
            </TreeItemWrapper>
        );
    }

    return (
        <>
            {isRenaming ? (
                <RenameInput
                    type="folder"
                    isOpen={isOpen}
                    loading={renaming}
                    defaultValue={filename}
                    level={level}
                    onSubmit={handleRename}
                    onCancel={() => setIsRenaming(false)}
                />
            ) : (
                <TreeItemWrapper
                    item={item}
                    level={level}
                    loading={deleting}
                    onClick={() => setIsOpen((open) => !open)}
                    onRename={() => setIsRenaming(true)}
                    onCreateFile={() => {
                        setCreating("file");
                        setIsOpen(true);
                    }}
                    onCreateFolder={() => {
                        setCreating("folder");
                        setIsOpen(true);
                    }}
                    onDelete={() => {
                        void handleDelete();
                    }}
                >
                    <ChevronRightIcon
                        className={cn(
                            "size-4 shrink-0 text-muted-foreground",
                            isOpen && "rotate-90",
                        )}
                    />
                    <FolderIcon
                        folderName={filename}
                        className="size-4 shrink-0"
                    />
                    <span className="truncate text-sm">
                        {filename}
                    </span>
                </TreeItemWrapper>
            )}

            {isOpen && (
                <>
                    {loading && <TreeItemWrapperSkeleton level={level + 1} />}

                    {creating && (
                        <CreateInput
                            type={creating}
                            level={level + 1}
                            loading={creatingFile}
                            onSubmit={handleCreate}
                            onCancel={() => setCreating(null)}
                        />
                    )}

                    {children.map((child) => (
                        <Tree
                            key={child.id}
                            item={child}
                            level={level + 1}
                            projectId={projectId}
                        />
                    ))}
                </>
            )}
        </>
    );
};
