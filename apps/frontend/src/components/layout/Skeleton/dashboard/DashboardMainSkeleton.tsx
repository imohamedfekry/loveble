import { Skeleton } from "@loveble/ui"
import { ChatComposerSkeleton } from "../ChatComposerSkeleton"

export function DashboardMainSkeleton() {
    return (
        <main className="relative flex min-h-full w-full flex-1 items-center justify-center overflow-hidden rounded-2xl border bg-background">
            <div className="relative z-10 w-full max-w-3xl">
                <div className="relative mb-6 flex flex-col items-center px-4 text-center md:mb-7">
                    <Skeleton className="h-7 w-[200px] md:h-8 md:w-[260px] rounded-md" />
                </div>
                <div className="m-auto w-[95%]">
                    <ChatComposerSkeleton />
                </div>
            </div>
        </main>
    )
}
