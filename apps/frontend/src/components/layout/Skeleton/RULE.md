# AI RULE — Skeletons Must Be 1:1 Pixel-Perfect

**Applies to:** Any file under `apps/frontend/src/components/layout/Skeleton/` and `apps/frontend/src/components/project/file-explorer/TreeItemWrapperSkeleton.tsx`

## Mandatory Steps Before Writing a Skeleton

1. **Read the real component source** — never guess. Open `AppSidebar.tsx`, `NavItem.tsx`, `ProjectNavbar.tsx`, `EditorView.tsx`, `FileExplorer/*`, `ProjectsPage.tsx`, `ChatComposer.tsx`.
2. **Copy classNames verbatim** — `h-7`, `px-2`, `mb-4`, `gap-1`, `ring-1`, `rounded-sm`, `h-8.75`, `h-5.5`, `w-[52px]`, etc. Do not approximate.
3. **Copy constants** — `DEFAULT_CONVERSATION_SIDEBAR_WIDTH = 400`, `DEFAULT_SIDEBAR_WIDTH = 350`, `MIN_SIDEBAR_WIDTH = 200`, `MAX_SIDEBAR_WIDTH = 800`, `TREE_*` sizes.
4. **Reuse existing skeleton components** — `SidebarSkeleton({ active })`, `AppShellSkeleton`, `DashboardMainSkeleton`, `ProjectsMainSkeleton`, `TreeItemWrapperSkeleton`. Do not duplicate markup.
5. **Active state:** Only one nav item gets `bg-foreground/[0.06] text-sidebar-foreground shadow-sm ring-border/50` — all others `ring-transparent`. Never use `bg-accent-foreground`.
6. **File tree rows:** Always `flex h-5.5 w-full gap-1 pr-2` with `paddingLeft: getItemPadding(level, isFile)` and `TreeItemWrapperSkeleton` — never `h-8` or `w-32`.
7. **Folder placement:** Dashboard shells → `Skeleton/dashboard/`, project/editor → `Skeleton/project/`. Never mix.
8. **Verify:** Run `npx tsc --noEmit --pretty false` and visually compare skeleton vs real UI toggle — zero layout shift.

**Violation = Rework.** If a skeleton is not 1:1, it must be corrected before merge.

## Quick Reference — Exact Matches

- `NavItem active` → `NavItem.tsx:93` = `bg-foreground/[0.06] ring-border/50 shadow-sm`
- `Sidebar` → `AppSidebar.tsx:121` = `width:256 py-2`
- `SectionLabel` → `SectionLabel.tsx:13` = `mt-5 mb-1.5 px-4 text-[11px]`
- `Tree row` → `TreeItemWrapper.tsx:102` = `h-5.5 gap-1 getItemPadding`
- `ProjectNavbar` → `project-navbar.tsx:78` = `flex border-b bg-card px-3 py-2` with real `loveble` + `ChevronRightIcon size-3.5`
- `Editor empty` → `editor-view.tsx:234` = `Image 50x50 opacity-25 size-full flex center`
