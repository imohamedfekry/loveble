import { Skeleton } from "@loveble/ui"
import Image from "next/image"
import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"
import { TreeItemWrapperSkeleton } from "@/components/project/file-explorer/TreeItemWrapperSkeleton"
import { ChatComposerSkeleton } from "../ChatComposerSkeleton"

function ProjectSkeleton() {
    return (
        <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background">
            <nav className="flex h-8 shrink-0 items-center justify-between gap-x-2 border-b border-border bg-card px-2">
                <div className="flex h-8 items-center gap-x-2">
                    <Link
                        href="/dashboard"
                        className="group flex items-center gap-1.5 transition-opacity hover:opacity-80"
                    >
                        <span className="grid h-7 w-8 shrink-0 place-items-center">
                            <Image
                                src="/logo.svg"
                                alt="loveble"
                                width={18}
                                height={18}
                                loading="eager"
                                className="size-4.5 object-contain"
                            />
                        </span>
                        <span className="text-sm font-semibold text-foreground">loveble</span>
                    </Link>
                    <ChevronRightIcon className="ml-0 mr-1 size-3.5 shrink-0 text-muted-foreground rtl:rotate-180" />
                    <Skeleton className="h-4 w-[120px] rounded-md" />
                    <Skeleton className="size-4 rounded-full opacity-60" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="size-8 rounded-full" />
                </div>
            </nav>

            <div className="relative flex min-h-0 flex-1 overflow-hidden">
                <div className="flex flex-1 overflow-hidden">
                    <div
                        style={{ width: 500, minWidth: 200, maxWidth: 800 }}
                        className="flex h-full shrink-0 flex-col border-r border-border bg-sidebar"
                    >
                        <div className="flex h-8.75 shrink-0 items-center justify-between border-b border-border px-3">
                            <Skeleton className="h-3 w-[92px] rounded-sm" />
                            <div className="flex items-center gap-1">
                                <Skeleton className="size-3.5 rounded-sm opacity-60" />
                                <Skeleton className="size-3.5 rounded-sm opacity-60" />
                            </div>
                        </div>
                        <div className="flex-1 space-y-3 overflow-y-auto p-3">
                            <div className="flex justify-end ">
                                <Skeleton className="h-3 w-3/4 rounded-sm" />
                            </div>
                            <div className="flex justify-start flex-col gap-1.5 max-w-[75%]">
                                <Skeleton className="h-3 w-full rounded-sm" />
                                <Skeleton className="h-3 w-3/4 rounded-sm opacity-70" />
                            </div>
                        </div>
                        <div className="shrink-0 border-t border-border p-3">
                            <ChatComposerSkeleton />
                        </div>
                    </div>

                    <div className="flex h-full min-w-0 flex-1 flex-col">
                        <nav className="flex h-8.75 shrink-0 items-center border-b border-border bg-card">
                            <div className="flex h-full items-center gap-2 border-r border-border bg-background px-3">
                                <Skeleton className="h-3.5 w-8 rounded-sm" />
                            </div>
                            <div className="flex h-full items-center gap-2 border-r border-border px-3">
                                <Skeleton className="h-3.5 w-11.5 rounded-sm opacity-60" />
                            </div>
                            <div className="flex h-full flex-1 justify-end">
                                <div className="flex h-full items-center gap-1.5 border-l border-border px-3">
                                    <Skeleton className="size-3.5 rounded-sm" />
                                    <Skeleton className="h-3.5 w-9.5 rounded-sm opacity-70" />
                                </div>
                            </div>
                        </nav>

                        <div className="relative flex flex-1 min-h-0 bg-card">
                            <div className="absolute inset-0 flex">

                                <div
                                    style={{ width: 320, minWidth: 200, maxWidth: 800 }}
                                    className="flex h-full shrink-0 flex-col bg-sidebar"
                                >
                                    <div className="flex h-5.5 w-full shrink-0 items-center gap-0.5 bg-accent px-0">
                                        <Skeleton className="ml-1 size-4 rounded-sm opacity-40" />
                                        <Skeleton className="ml-1 h-3 w-24 rounded-sm opacity-60" />
                                        <div className="ml-auto flex items-center gap-0.5 pr-1">
                                            <Skeleton className="size-5 rounded-sm opacity-30" />
                                            <Skeleton className="size-5 rounded-sm opacity-30" />
                                            <Skeleton className="size-5 rounded-sm opacity-30" />
                                            <Skeleton className="size-5 rounded-sm opacity-30" />
                                        </div>
                                    </div>
                                    <div className="flex min-h-0 flex-1 flex-col pt-1">
                                        <TreeItemWrapperSkeleton level={0} isFile={true} width="w-24" />
                                        <TreeItemWrapperSkeleton level={0} isFile={true} width="w-20" />
                                        <TreeItemWrapperSkeleton level={0} isFile={false} width="w-[88px]" />
                                        <TreeItemWrapperSkeleton level={0} isFile={true} width="w-[72px]" />
                                        <TreeItemWrapperSkeleton level={0} isFile={true} width="w-[96px]" />
                                        <TreeItemWrapperSkeleton level={1} isFile={true} width="w-[84px]" />
                                        <TreeItemWrapperSkeleton level={0} isFile={true} width="w-[56px]" />
                                    </div>
                                </div>

                                <div className="flex h-full min-w-0 flex-1 flex-col">


                                    <div className="relative flex flex-1 min-h-0 bg-muted overflow-hidden">
                                        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                                            <Image src="/logo.svg" alt="loveble Logo" width={50} height={50} loading="eager" className="opacity-25" />
                                        </div>
                                        <div className="flex h-full w-full overflow-hidden bg-muted">
                                            <div className="border-r bg-(--editor-gutter-bg)">

                                            </div>
                                            <div className="flex flex-1 flex-col overflow-hidden">

                                                <div className="pointer-events-none h-[36px] shrink-0 bg-(--editor-bg) border-b border-l border-border " />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ProjectSkeleton
