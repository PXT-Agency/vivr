# VIVR

OSSK star-number inventory and VIVR marketplace.

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19, TypeScript (strict), Tailwind CSS v4
- shadcn/ui + Lucide icons
- Zod for input and environment validation
- Drizzle ORM + `postgres` (PostgreSQL driver)
- Vitest for tests, ESLint + Prettier for code quality

## Prerequisites

- Node.js 20+
- pnpm 11+
- PostgreSQL (optional for Phase 1 foundation; required for database work)

## Getting started

```bash
pnpm install
cp .env.example .env.local   # set DATABASE_URL when the database is provisioned
pnpm dev
```

Open http://localhost:3000. `/api/health` returns `{ "ok": true }`.

## Commands

| Command            | Purpose                                       |
| ------------------ | --------------------------------------------- |
| `pnpm dev`         | Start the development server                  |
| `pnpm build`       | Production build                              |
| `pnpm start`       | Serve the production build                    |
| `pnpm lint`        | Run ESLint                                    |
| `pnpm typecheck`   | Run `tsc --noEmit`                            |
| `pnpm test`        | Run Vitest once                               |
| `pnpm format`      | Format all files with Prettier                |
| `pnpm format:check`| Check formatting with Prettier                |
| `pnpm check`       | Run lint, typecheck, test, and build          |
| `pnpm db:generate` | Generate a Drizzle migration                  |
| `pnpm db:migrate`  | Apply Drizzle migrations (`DATABASE_URL` required) |

## Environment variables

See `.env.example` for the full list with examples. Required values:

- `NEXT_PUBLIC_APP_URL` — canonical application URL.
- `DATABASE_URL` — PostgreSQL connection string (secret). Required only at
  database boundaries; the app still boots and serves `/api/health` without it.

Never commit `.env*` files except `.env.example`.

## Project structure

```text
src/
  app/
    (public)/      public marketing shell
    (dashboard)/   authenticated dashboard shell
    api/           route handlers
  components/
    ui/            shadcn/ui components
    layout/        shell layouts
  lib/
    env/           environment validation (Zod)
    validation/    server-side input validation helpers
    utils/         cn(), etc.
  server/
    db/            Drizzle client, schema, migrations helper
    repositories/  data-access layer (populated in later phases)
    services/      business logic (populated in later phases)
  styles/          global styles (Tailwind v4 + shadcn theme)
  types/           shared types
  config/          site configuration
  features/        feature areas (populated in later phases)
```

## Development rules

- Prefer Server Components; use Client Components only for browser interaction.
- Keep business logic outside React components.
- Validate all external input with Zod.
- All database access goes through Drizzle.
- Never trust tenant IDs submitted by the browser; resolve context server-side.
- Run `pnpm check` before considering work complete.