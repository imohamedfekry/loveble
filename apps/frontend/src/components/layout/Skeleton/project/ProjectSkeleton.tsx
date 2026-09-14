import { Skeleton } from "@loveble/ui"
import Image from "next/image"
import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"
import { TreeItemWrapperSkeleton } from "@/components/project/file-explorer/TreeItemWrapperSkeleton"

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
                    {/* Conversation — fixed DEFAULT_CONVERSATION_SIDEBAR_WIDTH=400 */}
                    <div
                        style={{ width: 400, minWidth: 200, maxWidth: 800 }}
                        className="flex h-full shrink-0 flex-col border-r border-border bg-card"
                    >
                        <div className="flex h-8.75 shrink-0 items-center border-b border-border px-3">
                            <Skeleton className="h-3 w-[92px] rounded-sm" />
                        </div>
                        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                            <Skeleton className="size-10 rounded-full border border-border" />
                            <Skeleton className="h-3.5 w-[132px] rounded-sm" />
                            <Skeleton className="h-3 w-[168px] rounded-sm opacity-70" />
                            <Skeleton className="h-3 w-[148px] rounded-sm opacity-60" />
                        </div>
                    </div>

                    {/* Main — flex-1 */}
                    <div className="flex h-full min-w-0 flex-1 flex-col">
                        <nav className="flex h-8.75 shrink-0 items-center border-b border-border bg-card">
                            <div className="flex h-full items-center gap-2 border-r border-border bg-background px-3">
                                <Skeleton className="h-3.5 w-[32px] rounded-sm" />
                            </div>
                            <div className="flex h-full items-center gap-2 border-r border-border px-3">
                                <Skeleton className="h-3.5 w-[46px] rounded-sm opacity-60" />
                            </div>
                            <div className="flex h-full flex-1 justify-end">
                                <div className="flex h-full items-center gap-1.5 border-l border-border px-3">
                                    <Skeleton className="size-3.5 rounded-sm" />
                                    <Skeleton className="h-3.5 w-[38px] rounded-sm opacity-70" />
                                </div>
                            </div>
                        </nav>

                        <div className="relative flex flex-1 min-h-0 bg-card">
                            <div className="absolute inset-0 flex">
                                {/* FileExplorer — fixed width 350 = 5% smaller editor */}
                                <div
                                    style={{ width: 350, minWidth: 200, maxWidth: 800 }}
                                    className="flex h-full shrink-0 flex-col bg-sidebar"
                                >
                                    <div className="flex h-5.5 w-full shrink-0 items-center gap-0.5 bg-accent px-0">
                                        <Skeleton className="ml-1 size-4 rounded-sm opacity-40" />
                                        <Skeleton className="ml-1 h-3 w-[96px] rounded-sm opacity-60" />
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

                                {/* EditorView — flex-1 => now ~5% smaller */}
                                <div className="flex h-full min-w-0 flex-1 flex-col">
                                    <div className="flex h-8.75 shrink-0 items-center border-b bg-sidebar">
                                        <div className="flex h-8.75 items-center gap-2 border-y border-x border-border bg-accent px-2 pr-1.5 -mb-px">
                                            <Skeleton className="size-4 rounded-sm" />
                                            <Skeleton className="h-3 w-[72px] rounded-sm" />
                                            <Skeleton className="ml-1 size-3.5 rounded-sm opacity-40" />
                                        </div>
                                        <div className="flex h-8.75 items-center gap-2 border-y border-transparent px-2 pr-1.5">
                                            <Skeleton className="size-4 rounded-sm opacity-60" />
                                            <Skeleton className="h-3 w-[64px] rounded-sm opacity-60" />
                                        </div>
                                    </div>

                                    <div className="flex h-8.75 shrink-0 items-center justify-between border-b bg-sidebar pl-4 pr-2">
                                        <div className="flex items-center gap-0.5">
                                            <Skeleton className="h-3 w-[52px] rounded-sm" />
                                            <Skeleton className="mx-1 size-3 rounded-sm opacity-30" />
                                            <Skeleton className="size-4 rounded-sm" />
                                            <Skeleton className="h-3 w-[78px] rounded-sm" />
                                        </div>
                                    </div>

                                    <div className="relative flex flex-1 min-h-0 bg-muted overflow-hidden">
                                        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                                            <Image src="/logo.svg" alt="loveble Logo" width={50} height={50} loading="eager" className="opacity-25" />
                                        </div>
                                        <div className="flex h-full w-full overflow-hidden bg-[var(--editor-bg)]">
                                            <div className="hidden sm:flex w-[52px] shrink-0 flex-col items-end gap-[16px] border-r bg-[var(--editor-gutter-bg)] py-4 pr-3">
                                                {Array.from({ length: 20 }).map((_, i) => {
                                                    const isSingleDigit = i < 9
                                                    const w = isSingleDigit ? 12 + (i % 2) * 2 : 18 + (i % 2) * 2
                                                    return <Skeleton key={i} className="h-3 rounded-[3px]" style={{ width: `${w}px`, opacity: 0.9 - i * 0.032 }} />
                                                })}
                                            </div>
                                            <div className="flex flex-1 flex-col overflow-hidden">
                                                <div className="flex-1 px-4 py-4 sm:pl-5 pr-6">
                                                    <div className="flex flex-col gap-[16px]">
                                                        <div className="flex items-center gap-2">
                                                            <Skeleton className="h-3 w-14 rounded-[3px]" />
                                                            <Skeleton className="h-3 w-20 rounded-[3px] opacity-80" />
                                                            <Skeleton className="h-3 w-7 rounded-[3px] opacity-50" />
                                                            <Skeleton className="h-3 w-32 rounded-[3px]" />
                                                            <Skeleton className="h-3 w-10 rounded-[3px] opacity-60" />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Skeleton className="h-3 w-14 rounded-[3px] opacity-70" />
                                                            <Skeleton className="h-3 w-28 rounded-[3px]" />
                                                            <Skeleton className="h-3 w-16 rounded-[3px] opacity-50" />
                                                        </div>
                                                        <div className="h-1" />
                                                        <div className="flex items-center gap-2">
                                                            <Skeleton className="h-3 w-12 rounded-[3px]" />
                                                            <Skeleton className="h-3 w-24 rounded-[3px]" />
                                                            <Skeleton className="h-3 w-3 rounded-[3px] opacity-40" />
                                                            <Skeleton className="h-3 w-20 rounded-[3px] opacity-90" />
                                                            <Skeleton className="h-3 w-2 rounded-[3px] opacity-30" />
                                                            <Skeleton className="h-3 w-16 rounded-[3px] opacity-70" />
                                                        </div>
                                                        <div className="flex items-center gap-2 pl-6">
                                                            <Skeleton className="h-3 w-16 rounded-[3px] opacity-60" />
                                                            <Skeleton className="h-3 w-36 rounded-[3px]" />
                                                            <Skeleton className="h-3 w-12 rounded-[3px] opacity-40" />
                                                        </div>
                                                        <div className="flex items-center gap-2 pl-6">
                                                            <Skeleton className="h-3 w-20 rounded-[3px] opacity-80" />
                                                            <Skeleton className="h-3 w-8 rounded-[3px] opacity-40" />
                                                            <Skeleton className="h-3 w-24 rounded-[3px]" />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Skeleton className="h-3 w-3 rounded-[3px] opacity-40" />
                                                        </div>
                                                        <div className="h-1" />
                                                        <div className="flex items-center gap-2">
                                                            <Skeleton className="h-3 w-16 rounded-[3px]" />
                                                            <Skeleton className="h-3 w-28 rounded-[3px]" />
                                                            <Skeleton className="h-3 w-20 rounded-[3px] opacity-70" />
                                                            <Skeleton className="h-3 w-3 rounded-[3px] opacity-40" />
                                                        </div>
                                                        <div className="flex items-center gap-2 pl-6">
                                                            <Skeleton className="h-3 w-10 rounded-[3px] opacity-80" />
                                                            <Skeleton className="h-3 w-32 rounded-[3px]" />
                                                            <Skeleton className="h-3 w-12 rounded-[3px] opacity-50" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="pointer-events-none h-10 shrink-0 bg-gradient-to-t from-[var(--editor-bg)] to-transparent" />
                                            </div>
                                            <div className="hidden lg:flex w-16 shrink-0 flex-col gap-1.5 border-l bg-[var(--editor-bg)] px-2 py-4 opacity-40">
                                                {Array.from({ length: 18 }).map((_, i) => (
                                                    <Skeleton key={i} className="h-1 rounded-full" style={{ width: `${40 + (i % 4) * 12}%`, opacity: 0.7 - i * 0.03 }} />
                                                ))}
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
