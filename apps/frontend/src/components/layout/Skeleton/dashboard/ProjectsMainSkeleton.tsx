import { Skeleton } from "@loveble/ui"
import { cn } from "@loveble/utils"

type FilterTab = "all" | "starred" | "created" | "shared"

const TABS: { id: FilterTab; label: string; w: string }[] = [
    { id: "all", label: "All projects", w: "w-[98px]" },
    { id: "starred", label: "Starred", w: "w-[78px]" },
    { id: "created", label: "Created by me", w: "w-[118px]" },
    { id: "shared", label: "Shared with me", w: "w-[124px]" },
]

export function ProjectsMainSkeleton({ activeTab = "all" }: { activeTab?: FilterTab }) {
    return (
        <div className="flex h-full flex-1 flex-col rounded-2xl bg-muted">
            {/* Tabs — 1:1 with ProjectsPage.tsx:68 */}
            <nav className="flex shrink-0 gap-1 px-6 pt-3">
                {TABS.map(({ id, w }) => {
                    const active = activeTab === id
                    return (
                        <div
                            key={id}
                            className={cn(
                                "flex items-center gap-2 rounded-sm px-3 py-1.5 ring-1",
                                active
                                    ? "bg-foreground/[0.06] ring-border/50 shadow-sm"
                                    : "ring-transparent"
                            )}
                        >
                            <Skeleton className="h-4 w-4 rounded-sm" />
                            <Skeleton className={cn("h-3.5 rounded-sm", w, active ? "opacity-100" : "opacity-60")} />
                        </div>
                    )
                })}
            </nav>

            {/* List — 1:1 with ProjectsPage list area */}
            <main className="flex min-h-0 flex-1 overflow-auto">
                <ul className="w-full max-w-3xl space-y-1 px-6 py-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <li key={i} className="flex h-7 items-center gap-2 rounded-sm px-2 ring-1 ring-transparent">
                            <Skeleton className="h-3.5 w-full max-w-[220px] rounded-sm" style={{ width: `${60 + (i % 3) * 15}%` }} />
                        </li>
                    ))}
                </ul>
            </main>
        </div>
    )
}
