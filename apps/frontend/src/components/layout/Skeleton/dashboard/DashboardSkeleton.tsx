import { SidebarSkeleton, type SidebarActive } from "./SidebarSkeleton"
import { AppShellSkeleton } from "./AppShellSkeleton"
import { DashboardMainSkeleton } from "./DashboardMainSkeleton"

function DashboardSkeleton({ active = "dashboard" }: { active?: SidebarActive }) {
    return (
        <AppShellSkeleton active={active} outerBg="bg-background">
            <DashboardMainSkeleton />
        </AppShellSkeleton>
    )
}

export default DashboardSkeleton
export { SidebarSkeleton, AppShellSkeleton, DashboardMainSkeleton }
export type { SidebarActive }
