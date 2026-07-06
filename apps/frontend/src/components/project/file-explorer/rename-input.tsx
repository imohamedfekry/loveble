import { ChevronRightIcon } from "lucide-react";
import { FileIcon, FolderIcon } from "@react-symbols/icons/utils"
import { CreateFileRequest, UpdateFile } from "@/lib/api/apis/files/types";
import { useEffect, useRef, useState } from "react";
import { getItemPadding } from "./constants";
import { cn } from "@/lib/utils";

export const RenameInput = ({
    type,
    defultValue,
    isOpen,
    level,
    onSubmit,
    onCancel,
}: {
    type: "file" | "folder",
    defultValue: string,
    isOpen: boolean,
    level: number,
    onSubmit: (data: UpdateFile) => void,
    onCancel: () => void

}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState(defultValue);

useEffect(() => {
    const id = requestAnimationFrame(() => {
        inputRef.current?.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(id);
}, []);

    const handleSubmit = () => {
        const triimedValue = value.trim() || defultValue;
        onSubmit({ name: triimedValue });
    }



    return (
        <div
            className="w-full min-w-0 flex items-center gap-1 h-5.5 bg-accent/30"
            style={{ paddingLeft: getItemPadding(level, type === "file") }}
        >
            <div className="flex shrink-0 items-center gap-0.5">
                {type === "folder" && (
                    <ChevronRightIcon className={cn("size-4 shrink-0 text-muted-foreground", isOpen && "rotate-90")

                    } />
                )}
                {type === "file" && (
                    <FileIcon fileName={value} autoAssign className="size-4" />
                )}

                {type === "folder" && (
                    <FolderIcon folderName={value} className="size-4" />
                )}
            </div>
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={handleSubmit}
                onKeyDown={(e) => {
                    switch (e.key) {
                        case "Enter":
                            handleSubmit();
                            break;

                        case "Escape":
                            onCancel();
                            break;
                    }
                }}
                onFocus={(e) => {
                    if (type === "folder") {
                        e.currentTarget.select();
                    } else {
                        const value = e.currentTarget.value
                        const lastDotIndex = value.lastIndexOf(".")
                        if (lastDotIndex > 0) {
                            e.currentTarget.setSelectionRange(0, lastDotIndex)
                        } else {
                            e.currentTarget.select()
                        }
                    }
                }}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none focus:ring-1 focus:ring-inset focus:ring-ring"
            />
        </div>
    )
}


