import { Skeleton } from "@loveble/ui"
import Image from "next/image"
import { cn } from "@loveble/utils"

export type SidebarActive =
    | "dashboard"
    | "search"
    | "resources"
    | "connectors"
    | "all"
    | "starred"
    | "created"
    | "shared"

function navItemClass(active: boolean) {
    return cn(
        "flex h-7 w-full items-center rounded-sm p-0 ring-1",
        active
            ? "bg-foreground/[0.06] text-sidebar-foreground shadow-sm ring-border/50"
            : "ring-transparent"
    )
}

export function SidebarSkeleton({ active = "dashboard" }: { active?: SidebarActive }) {
    return (
        <aside
            style={{ width: 256 }}
            className="hidden shrink-0 flex-col overflow-hidden bg-sidebar py-2 will-change-[width] md:flex"
        >
            {/* Header — mb-4 h-8 px-2 — 1:1 AppSidebar.tsx:137 */}
            <div className="mb-4 flex h-8 shrink-0 items-center px-2">
                <div className="grid h-7 w-8 shrink-0 place-items-center rounded-md">
                    <Image src="/logo.svg" alt="loveble" width={18} height={18} loading="eager" className="size-4.5 object-contain" />
                </div>
                <div className="ml-auto flex h-7 w-8 shrink-0 items-center justify-center rounded-md">
                    <Skeleton className="size-4.5 rounded-md" />
                </div>
            </div>

            {/* Workspace — mb-2 px-2 / h-7 — WorkspaceMenu.tsx:41 */}
            <div className="mb-2 px-2">
                <div className="flex h-7 w-full items-center overflow-hidden rounded-md p-0 ring-1 ring-border">
                    <span className="flex h-7 w-8 shrink-0 items-center justify-center">
                        <Skeleton className="h-5 w-5 rounded-[5px]" />
                    </span>
                    <Skeleton className="h-3 w-[110px]" />
                    <span className="ml-auto flex h-7 w-8 shrink-0 items-center justify-center">
                        <Skeleton className="h-3.5 w-3.5 rounded-sm" />
                    </span>
                </div>
            </div>

            {/* Main navigation — space-y-1 px-2 / each h-7 — NavItem.tsx:82 */}
            <nav className="space-y-1 px-2">
                <div className={navItemClass(active === "dashboard")}>
                    <span className="flex h-7 w-8 shrink-0 items-center justify-center">
                        <Skeleton className="size-4.5 rounded-sm" />
                    </span>
                    <Skeleton className="h-3 w-[68px]" />
                </div>

                <div className={navItemClass(active === "search")}>
                    <span className="flex h-7 w-8 shrink-0 items-center justify-center">
                        <Skeleton className="size-4.5 rounded-sm" />
                    </span>
                    <Skeleton className="h-3 w-[42px]" />
                    <Skeleton className="ml-auto mr-2 h-[18px] w-8 rounded-sm border border-border/40" />
                </div>

                <div className={navItemClass(active === "resources")}>
                    <span className="flex h-7 w-8 shrink-0 items-center justify-center">
                        <Skeleton className="size-4.5 rounded-sm" />
                    </span>
                    <Skeleton className="h-3 w-[62px]" />
                </div>

                <div className={navItemClass(active === "connectors")}>
                    <span className="flex h-7 w-8 shrink-0 items-center justify-center">
                        <Skeleton className="size-4.5 rounded-sm" />
                    </span>
                    <Skeleton className="h-3 w-[67px]" />
                </div>
            </nav>

            {/* Projects label — mt-5 mb-1.5 px-4 — SectionLabel.tsx:13 */}
            <div className="mb-1.5 mt-5 overflow-hidden px-4 text-[11px] font-semibold uppercase tracking-wider">
                <Skeleton className="h-3 w-[52px]" />
            </div>

            <nav className="space-y-1 px-2">
                <div className={navItemClass(active === "all")}>
                    <span className="flex h-7 w-8 shrink-0 items-center justify-center">
                        <Skeleton className="size-4.5 rounded-sm" />
                    </span>
                    <Skeleton className="h-3 w-[78px]" />
                </div>
                <div className={navItemClass(active === "starred")}>
                    <span className="flex h-7 w-8 shrink-0 items-center justify-center">
                        <Skeleton className="size-4.5 rounded-sm" />
                    </span>
                    <Skeleton className="h-3 w-[48px]" />
                </div>
                <div className={navItemClass(active === "created")}>
                    <span className="flex h-7 w-8 shrink-0 items-center justify-center">
                        <Skeleton className="size-4.5 rounded-sm" />
                    </span>
                    <Skeleton className="h-3 w-[92px]" />
                </div>
                <div className={navItemClass(active === "shared")}>
                    <span className="flex h-7 w-8 shrink-0 items-center justify-center">
                        <Skeleton className="size-4.5 rounded-sm" />
                    </span>
                    <Skeleton className="h-3 w-[96px]" />
                </div>
            </nav>

            {/* Recents — mt-5 mb-1.5 px-4 + px-2 py-1 */}
            <div className="mb-1.5 mt-5 overflow-hidden px-4 text-[11px] font-semibold uppercase tracking-wider">
                <Skeleton className="h-3 w-[48px]" />
            </div>

            <div className="px-2 py-1">
                <div className="space-y-1">
                    <div className="flex h-7 w-full items-center rounded-sm p-0 pr-2 ring-1 ring-transparent">
                        <div className="min-w-0 flex-1 pl-2"><Skeleton className="h-3.5 w-[140px]" /></div>
                    </div>
                    <div className="flex h-7 w-full items-center rounded-sm p-0 pr-2 ring-1 ring-transparent">
                        <div className="min-w-0 flex-1 pl-2"><Skeleton className="h-3.5 w-[105px]" /></div>
                    </div>
                    <div className="flex h-7 w-full items-center rounded-sm p-0 pr-2 ring-1 ring-transparent">
                        <div className="min-w-0 flex-1 pl-2"><Skeleton className="h-3.5 w-[115px]" /></div>
                    </div>
                    <div className="flex h-7 w-full items-center rounded-sm p-0 pr-2 ring-1 ring-transparent">
                        <div className="min-w-0 flex-1 pl-2"><Skeleton className="h-3.5 w-[70px]" /></div>
                    </div>
                    <div className="flex h-7 w-full items-center rounded-sm p-0 pr-2 ring-1 ring-transparent">
                        <div className="min-w-0 flex-1 pl-2"><Skeleton className="h-3.5 w-[90px]" /></div>
                    </div>
                </div>
            </div>

            {/* Bottom — mt-auto px-2 pt-6 / relative h-8 — AppSidebar.tsx:371 */}
            <div className="mt-auto shrink-0 px-2 pt-6">
                <div className="relative h-8">
                    <Skeleton className="absolute bottom-1 left-1 h-6 w-6 rounded-full" />
                    <Skeleton className="absolute bottom-0 right-8 size-7 rounded-md" />
                    <Skeleton className="absolute bottom-0 right-0 size-7 rounded-md" />
                </div>
            </div>
        </aside>
    )
}
