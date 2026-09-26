import { Skeleton } from "@loveble/ui"

export function ChatComposerSkeleton() {
    return (
        <div className="relative isolate flex flex-col gap-1.5 overflow-hidden rounded-[24px] border border-border bg-muted p-1.5">
            <div className="grid items-end gap-x-1.5 gap-y-1.5 overflow-hidden p-2 grid-cols-[32px_minmax(0,1fr)_auto_32px_0px]">
                <Skeleton className="col-start-1 row-start-1 h-8 w-8 rounded-lg bg-foreground/5" />
                <div className="col-start-2 row-start-1 flex min-w-0 items-center px-1.5 py-1.5">
                    <Skeleton className="h-4 w-[118px] rounded-sm" />
                </div>
                <Skeleton className="col-start-3 row-start-1 h-8 w-[72px] rounded-lg bg-foreground/5" />
                <Skeleton className="col-start-4 row-start-1 h-8 w-8 rounded-lg bg-foreground/5" />
            </div>
        </div>
    )
}
