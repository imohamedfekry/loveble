# Skeleton 1:1 Rule — Pixel-Perfect Skeletons

This folder owns **all** loading skeletons. Every skeleton **must** be 1:1 with the real UI — same measurements, same spacing, same colors, down to the pixel. No approximations.

## Folder Structure

```
Skeleton/
├── dashboard/           # Everything outside the project (app shell)
│   ├── SidebarSkeleton.tsx        # AppSidebar open state — 256px / py-2 / NavItem h-7
│   ├── AppShellSkeleton.tsx       # Shell: Sidebar + main py-1.5 pr-1.5 rounded-2xl
│   ├── DashboardMainSkeleton.tsx  # Dashboard center: title + composer rounded-[24px]
│   ├── ProjectsMainSkeleton.tsx   # Projects tabs + list (1:1 with ProjectsPage.tsx)
│   ├── DashboardSkeleton.tsx      # AppShell + DashboardMain  (for /dashboard)
│   └── ProjectsSkeleton.tsx       # AppShell + ProjectsMain  (for /projects/*)
└── project/             # Project route only (code editor)
    └── ProjectSkeleton.tsx        # Navbar + conversation 400 + explorer 350 + editor
        └── uses TreeItemWrapperSkeleton (project/file-explorer) for file rows

Never put dashboard skeletons in `project/` and never put editor skeletons in `dashboard/`.
```

## The Golden Rule

> **Read the real component source first. Copy its exact classNames, constants, and layout — then replace content with `<Skeleton />`.**

## How to Build a 1:1 Skeleton (Checklist)

### 1. Inspect the real component
- Open the real `.tsx` (e.g. `AppSidebar.tsx`, `NavItem.tsx`, `ProjectNavbar.tsx`, `EditorView.tsx`).
- Copy `className` strings verbatim — `h-7`, `px-2`, `mb-4`, `gap-1`, `ring-1`, `rounded-sm`, etc.
- Copy constants: `DEFAULT_CONVERSATION_SIDEBAR_WIDTH = 400`, `MIN_SIDEBAR_WIDTH = 200`, `h-8.75` (=35px), `h-5.5` (=22px), `w-[52px]` gutter, etc.
- Note the **hierarchy**: `flex h-screen bg-background > aside 256 + main bg-sidebar > div py-1.5 pr-1.5 > card rounded-2xl border`.

### 2. Replicate layout, not just look
- `aside` → `style={{ width: 256 }}` + `hidden md:flex bg-sidebar py-2`
- `NavItem` → `flex h-7 w-full rounded-sm p-0 ring-1` — active: `bg-foreground/[0.06] ring-border/50 shadow-sm`, inactive: `ring-transparent`
- `SectionLabel` → `mt-5 mb-1.5 px-4 text-[11px] uppercase`
- `TreeItemWrapper` → `flex h-5.5 w-full gap-1 pr-2` with `paddingLeft: getItemPadding(level, isFile)` — use `TreeItemWrapperSkeleton` directly.
- `ProjectNavbar` → `flex border-b bg-card px-3 py-2` with real `Link` + `loveble` text + `ChevronRightIcon size-3.5`, only project name is skeleton.
- `Editor` → `gutter w-[52px] py-4 pr-3 gap-[16px]` + `code px-4 sm:pl-5 pr-6 gap-[16px]` + `minimap w-16 gap-1.5 px-2 py-4` + centered `Image 50x50 opacity-25`.

### 3. Keep skeletons reusable
- Extract `SidebarSkeleton({ active })` — `active: "dashboard" | "all" | "starred" | "created" | "shared" | ...` controls `bg-foreground/[0.06]` on **one** item only.
- Extract `AppShellSkeleton({ active, children, outerBg })` — all pages share the same shell.
- Extract `DashboardMainSkeleton` and `ProjectsMainSkeleton` — compose via `DashboardSkeleton` / `ProjectsSkeleton`.

### 4. Match empty vs loading states
- `EditorView` empty → `Image 50x50 opacity-25` centered (`size-full flex items-center justify-center`) — must be visible in `ProjectSkeleton` as `absolute inset-0 z-10 pointer-events-none`.
- `FileExplorer` loading → 7 rows via `TreeItemWrapperSkeleton` with `level`/`isFile`/`width` variation — same component in both `FileExplorer/index.tsx` and `ProjectSkeleton.tsx`.

### 5. Verify
- `npx tsc --noEmit --pretty false` must pass.
- Visually toggle skeleton vs real UI (see `dashboard/layout.tsx` preview toggle) — no jump, no width change, no color mismatch.
- Check `active` highlight: `bg-foreground/[0.06]` not `bg-accent-foreground`.

## Common Pitfalls

| Mistake | Fix |
|---|---|
| `h-8` instead of `h-7` for NavItem | Copy `NavItem.tsx:82` exactly |
| `bg-accent-foreground` for active | Use `bg-foreground/[0.06] ring-border/50` |
| `w-64` instead of `width:256` | Use `style={{ width: 256 }}` like `AppSidebar` |
| Fixed width `400` vs `Allotment` defaultSizes | Use fixed `400` for initial `DEFAULT_CONVERSATION_SIDEBAR_WIDTH` (initial open), not proportional — see `project-split-layout.tsx:9` |
| `h-8` for file row | Use `h-5.5` + `getItemPadding` like `TreeItemWrapper.tsx:102` |
| Creating skeleton from scratch | Always compose from `SidebarSkeleton` + `*MainSkeleton` |

## Adding a New Skeleton

1. Create `dashboard/MyPageMainSkeleton.tsx` or `project/MyFeatureSkeleton.tsx`.
2. Reuse `SidebarSkeleton` + `AppShellSkeleton` — don't duplicate sidebar markup.
3. Pass `active` based on `usePathname()` (see `projects/layout.tsx:25`).
4. Export via `dashboard/DashboardSkeleton.tsx` barrel or new `MyPageSkeleton.tsx`.
5. Wire in the route `layout.tsx` with `isInitialLoading ? <MyPageSkeleton active="..."/> : realUI`.

## References

- Real sidebar: `components/layout/sidebar/AppSidebar.tsx`, `NavItem.tsx`, `SectionLabel.tsx`
- Real dashboard: `components/layout/dashboard.tsx`, `chat/composer/ChatComposer.tsx`
- Real projects: `components/layout/ProjectsPage.tsx`
- Real project: `components/project/project-id-layout.tsx`, `project-split-layout.tsx`, `project-id-view.tsx`, `editor/editor-view.tsx`, `file-explorer/index.tsx`, `tree-item-wrapper.tsx`
