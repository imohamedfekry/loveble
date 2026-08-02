import { ChevronRightIcon } from "lucide-react";
import { FileIcon, FolderIcon } from "@react-symbols/icons/utils";
import type { UpdateFile } from "@/lib/api/apis/files/types";
import { useEffect, useRef, useState } from "react";
import { getItemPadding } from "./constants";
import { cn } from "@/lib/utils";

export const RenameInput = ({
    type,
    defaultValue,
    isOpen,
    level,
    loading,
    onSubmit,
    onCancel,
}: {
    type: "file" | "folder";
    defaultValue: string;
    isOpen: boolean;
    level: number;
    loading: boolean;
    onSubmit: (data: UpdateFile) => Promise<void> | void;
    onCancel: () => void;
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState(defaultValue);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const id = requestAnimationFrame(() => {
            inputRef.current?.focus({ preventScroll: true });
        });

        return () => cancelAnimationFrame(id);
    }, []);

    const handleSubmit = async () => {
        const trimmedValue = value.trim() || defaultValue;

        setError(null);

        try {
            await onSubmit({ name: trimmedValue });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to rename item";
            console.log("Rename failed", err);
            setError(message);
        }
    };

    return (
        <div className="flex w-full min-w-0 flex-col">
            <div
                className={cn(
                    "flex h-5.5 w-full min-w-0 items-center gap-1 bg-white/[0.07] transition-opacity duration-200",
                    loading && "cursor-progress opacity-70",
                )}
                style={{ paddingLeft: getItemPadding(level, type === "file") }}
            >
                <div className="flex shrink-0 items-center gap-0.5">
                    {type === "folder" && (
                        <ChevronRightIcon
                            className={cn("size-4 shrink-0 text-muted-foreground", isOpen && "rotate-90")}
                        />
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
                    disabled={loading}
                    type="text"
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                        if (error) setError(null);
                    }}
                    onBlur={() => {
                        if (loading) return;
                        void handleSubmit();
                    }}
                    onKeyDown={(e) => {
                        if (loading) return;
                        switch (e.key) {
                            case "Enter":
                                void handleSubmit();
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
                            const nextValue = e.currentTarget.value;
                            const lastDotIndex = nextValue.lastIndexOf(".");
                            if (lastDotIndex > 0) {
                                e.currentTarget.setSelectionRange(0, lastDotIndex);
                            } else {
                                e.currentTarget.select();
                            }
                        }
                    }}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none focus:ring-1 focus:ring-inset focus:ring-ring"
                />
            </div>
            {error && <p className="px-1 pb-1 text-xs text-destructive">{error}</p>}
        </div>
    );
};


