"use client";

import { cn } from "@loveble/utils";
import { useMemo, useState } from "react";
import Image from "next/image";
import {
    ExternalLinkIcon,
    LoaderCircleIcon,
    RefreshCwIcon,
    TriangleAlertIcon,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { usePreview } from "@/lib/hooks/projects/usePreview";
import type { SandboxState } from "@/store/use-editor-store";

const STATUS_LABEL: Record<string, string> = {
    stopped: "Preparing preview...",
    installing: "Installing dependencies...",
    starting: "Starting preview server...",
    ready: "Live",
};

function PreviewLoading({ label }: { label: string }) {
    return (
        <div className="relative flex size-full flex-col items-center justify-center gap-4 overflow-hidden bg-muted">
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

            <LoaderCircleIcon className="relative size-6 animate-spin text-foreground/70" />

            <div className="relative flex flex-col items-center gap-1 text-center">
                <span className="text-sm font-medium text-foreground/80">
                    {label}
                </span>
                <span className="text-xs text-foreground/50">
                    Your app will appear here once it is ready
                </span>
            </div>
        </div>
    );
}

function PreviewError({
    message,
    onRetry,
}: {
    message: string;
    onRetry: () => void;
}) {
    return (
        <div className="flex size-full flex-col items-center justify-center gap-4 bg-muted px-6 text-center">
            <div className="grid size-10 place-items-center rounded-full bg-destructive/10">
                <TriangleAlertIcon className="size-5 text-destructive" />
            </div>

            <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-medium text-foreground">
                    Preview failed to start
                </span>
                <span className="max-w-md text-xs text-foreground/50">
                    {message}
                </span>
            </div>

            <button
                type="button"
                onClick={onRetry}
                className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm text-foreground transition-colors hover:bg-foreground/5 active:scale-[0.97]"
            >
                <RefreshCwIcon className="size-3.5" />
                <span>Retry</span>
            </button>
        </div>
    );
}

export const PreviewPane = ({
    projectId,
    sandboxState,
}: {
    projectId: string;
    sandboxState: SandboxState;
}) => {
    const { status, url, error, reload } = usePreview(projectId, true);
    const [iframeKey, setIframeKey] = useState(0);

    const src = useMemo(() => {
        if (!url) return undefined;
        try {
            return new URL(url, API_BASE_URL).toString();
        } catch {
            return undefined;
        }
    }, [url]);

    if (sandboxState.status === "starting") {
        return <PreviewLoading label="Starting environment..." />;
    }

    if (status === "error") {
        return (
            <PreviewError
                message={error ?? "Something went wrong"}
                onRetry={reload}
            />
        );
    }

    if (status !== "ready" || !src) {
        return (
            <PreviewLoading
                label={STATUS_LABEL[status] ?? "Preparing preview..."}
            />
        );
    }

    return (
        <div className="flex size-full flex-col bg-background">
            <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border bg-card px-2">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    Live
                </span>

                <div className="flex-1" />

                <button
                    type="button"
                    onClick={() => setIframeKey((key) => key + 1)}
                    title="Reload preview"
                    className="grid size-6 place-items-center rounded text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground active:scale-95"
                >
                    <RefreshCwIcon className="size-3.5" />
                </button>
                <button
                    type="button"
                    onClick={() => window.open(src, "_blank", "noopener")}
                    title="Open in new tab"
                    className="grid size-6 place-items-center rounded text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground active:scale-95"
                >
                    <ExternalLinkIcon className="size-3.5" />
                </button>
            </div>

            <iframe
                key={iframeKey}
                src={src}
                title="Project preview"
                className={cn("size-full flex-1 border-0 bg-white")}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
        </div>
    );
};
