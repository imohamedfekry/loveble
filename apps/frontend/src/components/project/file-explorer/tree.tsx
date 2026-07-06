import { useState } from "react";
import { ChevronRightIcon } from "lucide-react";
import { FileIcon, FolderIcon } from "@react-symbols/icons/utils";
import { cn } from "@/lib/utils";
import type { CreateFileRequest, ProjectFileType, UpdateFile } from "@/lib/api/apis/files/types";
import { LoadingRow } from "./loading-row";
import { CreateInput } from "./create-input";
import {
    useCreateFile,
    useDeleteFile,
    useLoadFolderContent,
    useUpdateFile,
} from "@/lib/hooks/file/useFiles";
import { TreeItemWrapper } from "./tree-item-wrapper";
import { RenameInput } from "./rename-input";

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
    const { updateFile } = useUpdateFile();
    const { createFile } = useCreateFile();
    const { deleteFile } = useDeleteFile();
    const filename = item.name
    const { files: children, loading } = useLoadFolderContent(
        projectId,
        item.id,
        isOpen && item.type === "folder",
    );
    const handleRename = (data: UpdateFile) => {
        setIsRenaming(false);

        if (data.name === filename) {
            return;
        }

        updateFile(projectId, item.id, data);
    };

    const handleCreate = (data: CreateFileRequest) => {
        setCreating(null);
        createFile(projectId, { ...data, parentId: item.id });
        setIsOpen(true);
    };

    if (item.type === "file") {
        if (isRenaming) {
            return <RenameInput
                type="file"
                isOpen={true}
                defultValue={filename}
                level={level}
                onSubmit={handleRename}
                onCancel={() => setIsRenaming(false)}
            />
        }
        return (
            <TreeItemWrapper
                item={item}
                level={level}
                isActive={false}
                onDelete={() => deleteFile(projectId, item.id)}
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
                defultValue={filename}
                level={level}
                onSubmit={handleRename}
                onCancel={() => setIsRenaming(false)}
            />
        ) : (
            <TreeItemWrapper
                item={item}
                level={level}
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
                onDelete={() => deleteFile(projectId, item.id)}
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
                {loading && <LoadingRow level={level + 1} />}

                {creating && (
                    <CreateInput
                        type={creating}
                        level={level + 1}
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
