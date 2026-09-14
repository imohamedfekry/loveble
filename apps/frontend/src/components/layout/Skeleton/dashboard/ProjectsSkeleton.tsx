import { AppShellSkeleton } from "./AppShellSkeleton"
import { ProjectsMainSkeleton } from "./ProjectsMainSkeleton"
import type { SidebarActive } from "./SidebarSkeleton"

type FilterTab = "all" | "starred" | "created" | "shared"

const tabToSidebarActive: Record<FilterTab, SidebarActive> = {
    all: "all",
    starred: "starred",
    created: "created",
    shared: "shared",
}

export function ProjectsSkeleton({ tab = "all" }: { tab?: FilterTab }) {
    return (
        <AppShellSkeleton active={tabToSidebarActive[tab]} outerBg="bg-sidebar">
            <div className="flex min-h-full flex-1 flex-col rounded-2xl border bg-background overflow-hidden">
                <ProjectsMainSkeleton activeTab={tab} />
            </div>
        </AppShellSkeleton>
    )
}

export default ProjectsSkeleton
