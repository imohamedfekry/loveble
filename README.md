# loveble

Monorepo for **loveble** — a collaborative project workspace.

## Layout

```
apps/
  backend/   NestJS + Fastify API (TypeScript, PostgreSQL via Drizzle, Redis, Socket.io, Inngest, Sentry)
  frontend/  Next.js 16 app (React 19, Tailwind, shadcn/base-ui, CodeMirror editor with realtime collab)
```

Each app keeps its own git history (imported via history-preserving merge) so it can stay in sync with its origin repo.

## Getting started

Requires [pnpm](https://pnpm.io/) (v10+).

```bash
pnpm install        # install all workspaces
```

### Run everything

```bash
pnpm dev            # backend + frontend in parallel
```

### Per-app

```bash
pnpm dev:backend    # NestJS watch mode (fastify)
pnpm dev:frontend   # Next.js dev server
```

### Build / lint

```bash
pnpm build          # build both apps
pnpm lint           # lint all apps
```

### Database (backend)

```bash
pnpm db:generate    # drizzle-kit generate
pnpm db:migrate     # drizzle-kit migrate
pnpm db:studio      # drizzle-kit studio
```

The backend needs a `DATABASE_URL` and related secrets via `apps/backend/.env` (see `apps/backend/.env` for the expected shape). The docker-compose files live in `apps/backend/` but are gitignored there.