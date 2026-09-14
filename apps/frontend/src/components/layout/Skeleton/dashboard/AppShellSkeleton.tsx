import { cn } from "@loveble/utils"
import { SidebarSkeleton, type SidebarActive } from "./SidebarSkeleton"

type AppShellSkeletonProps = {
    active?: SidebarActive
    children: React.ReactNode
    className?: string
    /** outer bg — dashboard uses bg-background, projects uses bg-sidebar */
    outerBg?: string
}

/**
 * Reusable shell — 1:1 with DashboardLayout / ProjectsLayout
 * Sidebar + main card shell (py-1.5 pr-1.5 rounded-2xl border)
 */
export function AppShellSkeleton({ active = "dashboard", children, className, outerBg = "bg-background" }: AppShellSkeletonProps) {
    return (
        <div className={cn("flex h-screen w-full overflow-hidden", outerBg, className)}>
            <SidebarSkeleton active={active} />
            <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-sidebar">
                <div className="flex min-h-0 flex-1 flex-col overflow-auto">
                    <div className="flex min-h-full flex-1 flex-col bg-sidebar py-1.5 pr-1.5">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    )
}
