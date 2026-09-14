import { Skeleton } from "@loveble/ui"

export function DashboardMainSkeleton() {
    return (
        <main className="relative flex min-h-full w-full flex-1 items-center justify-center overflow-hidden rounded-2xl border bg-background">
            <div className="relative z-10 w-full max-w-3xl">
                <div className="relative mb-6 flex flex-col items-center px-4 text-center md:mb-7">
                    <Skeleton className="h-7 w-[200px] md:h-8 md:w-[260px] rounded-md" />
                </div>
                <div className="m-auto w-[95%]">
                    <div className="relative">
                        <div className="relative isolate flex flex-col gap-1.5 overflow-hidden rounded-[24px] border border-border bg-card p-1.5">
                            <div className="grid items-end gap-x-1.5 gap-y-1.5 overflow-hidden p-2 grid-cols-[32px_minmax(0,1fr)_auto_32px_0px]">
                                <Skeleton className="col-start-1 row-start-1 h-8 w-8 rounded-lg" />
                                <div className="col-start-2 row-start-1 flex min-w-0 items-center px-1.5 py-1.5">
                                    <Skeleton className="h-4 w-[118px] rounded-sm" />
                                </div>
                                <Skeleton className="col-start-3 row-start-1 h-8 w-[72px] rounded-lg" />
                                <Skeleton className="col-start-4 row-start-1 h-8 w-8 rounded-lg" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}
