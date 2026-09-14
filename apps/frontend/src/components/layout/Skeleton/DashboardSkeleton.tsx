import { Skeleton } from "@loveble/ui"
import { cn } from "@loveble/utils"
import Image from "next/image"

function DashboardSkeleton({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "flex h-screen w-full overflow-hidden bg-background",
                className
            )}
        >
            {/* Sidebar */}
            <aside className="flex w-64 shrink-0 flex-col bg-sidebar px-3 py-3">
                {/* Top logo */}
                <div className="mb-5 flex h-8 items-center justify-between px-2">
                    <Image
                        src="/logo.svg"
                        alt="loveble"
                        width={18}
                        height={18}
                        loading="eager"
                        className="size-4.5 object-contain"
                    />

                    <Skeleton className="h-5 w-5 rounded-md" />
                </div>

                {/* Workspace */}
                <div className="mb-3 rounded-lg border border-border/70 bg-background/20 p-1">
                    <div className="flex h-5.5 items-center gap-2 rounded-md px-2">
                        <Skeleton className="h-5 w-5 shrink-0 rounded-[4px]" />

                        <Skeleton className="h-3 w-[108px]" />

                        <Skeleton className="ml-auto h-3 w-3 rounded-[2px]" />
                    </div>
                </div>

                {/* Main navigation */}
                <div className="space-y-1">
                    <Skeleton className="h-8 w-full rounded-md" />

                    <div className="flex h-8 items-center gap-2 px-2">
                        <Skeleton className="h-4 w-4 rounded-sm" />
                        <Skeleton className="h-3 w-[42px]" />
                        <Skeleton className="ml-auto h-3 w-6 rounded-sm" />
                    </div>

                    <div className="flex h-8 items-center gap-2 px-2">
                        <Skeleton className="h-4 w-4 rounded-sm" />
                        <Skeleton className="h-3 w-[62px]" />
                    </div>

                    <div className="flex h-8 items-center gap-2 px-2">
                        <Skeleton className="h-4 w-4 rounded-sm" />
                        <Skeleton className="h-3 w-[67px]" />
                    </div>
                </div>

                {/* Projects */}
                <div className="mt-6">
                    <Skeleton className="mb-2 ml-1 h-2.5 w-[52px]" />

                    <div className="space-y-1">
                        <div className="flex h-7 items-center gap-2 px-2">
                            <Skeleton className="h-3.5 w-3.5 rounded-sm" />
                            <Skeleton className="h-3 w-[65px]" />
                        </div>

                        <div className="flex h-7 items-center gap-2 px-2">
                            <Skeleton className="h-3.5 w-3.5 rounded-sm" />
                            <Skeleton className="h-3 w-[43px]" />
                        </div>

                        <div className="flex h-7 items-center gap-2 px-2">
                            <Skeleton className="h-3.5 w-3.5 rounded-sm" />
                            <Skeleton className="h-3 w-[77px]" />
                        </div>

                        <div className="flex h-7 items-center gap-2 px-2">
                            <Skeleton className="h-3.5 w-3.5 rounded-sm" />
                            <Skeleton className="h-3 w-[79px]" />
                        </div>
                    </div>
                </div>

                {/* Recents */}
                <div className="mt-6">
                    <Skeleton className="mb-2 ml-1 h-2.5 w-12" />

                    <div className="space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-26.25" />
                        <Skeleton className="h-4 w-28.75" />
                        <Skeleton className="h-4 w-17.5" />
                        <Skeleton className="h-4 w-22.5" />
                    </div>
                </div>

                {/* Bottom */}
                <div className="mt-auto flex items-center justify-between px-1 pb-1">
                    <Skeleton className="h-6 w-6 rounded-full" />

                    <div className="flex items-center gap-3">
                        <Skeleton className="h-4 w-4 rounded-sm" />
                        <Skeleton className="h-4 w-4 rounded-sm" />
                    </div>
                </div>
            </aside>

            {/* Main */}
            <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
                {/* Main content */}
                <div className="flex flex-1 flex-col items-center justify-center">
                    <Skeleton className="mb-10 h-9 w-71.25 rounded-md" />

                    {/* Prompt */}
                    <div className="w-166.25 max-w-[calc(100%-48px)]">
                        <div className="h-14.5 rounded-[20px] border bg-card p-2 shadow-sm">
                            <div className="flex h-full items-center">
                                <Skeleton className="ml-2 h-4 w-4 rounded-sm" />

                                <Skeleton className="ml-5 h-3 w-[120px]" />

                                <div className="ml-auto flex items-center gap-3">
                                    <Skeleton className="h-4 w-[55px] rounded-sm" />
                                    <Skeleton className="h-4 w-4 rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default DashboardSkeleton