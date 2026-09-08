# Phase 01 — Next.js Foundation, UI System and Developer Guardrails

## Goal
Create the production-grade Next.js foundation without implementing business workflows yet.

## Deliverables
- Next.js App Router project with TypeScript.
- `src/app` routing structure.
- Tailwind CSS and shadcn/ui configured.
- Shared design tokens and layout primitives.
- ESLint, Prettier and strict TypeScript.
- Zod installed.
- Drizzle ORM configured against PostgreSQL.
- Environment validation module.
- Basic error/loading/not-found boundaries.
- Health endpoint: `/api/health`.
- Base dashboard shell and public shell.
- Documentation and local development instructions.

## Recommended structure
```text
src/
  app/
    (public)/
    (auth)/
    (dashboard)/
    vivr/[slug]/
    api/
  components/
    ui/
    layout/
    vivr/
  lib/
    auth/
    db/
    env/
    validation/
    utils/
  server/
    services/
    repositories/
  styles/
  types/
  config/
  hooks/
  features/
    auth/
    organizations/
    vivr/
    telecom/
    voice/
    routing/
    billing/
```

## Rules
- Prefer Server Components for reads and static UI.
- Add `"use client"` only to components needing browser state/events.
- Do not create a generic client-side API layer for every server read.
- Use Server Actions or Route Handlers for mutations and public endpoints where appropriate.
- Keep domain logic out of React components.
- No hard-coded tenant IDs.
- No secrets in client bundles.

## UI direction
- Modern enterprise SaaS.
- Dense but breathable dashboards.
- Mobile-first VIVR preview.
- Accessible contrast, keyboard support and focus states.
- shadcn/ui components as primitives, not a design prison.
- Use Lucide icons consistently.

## Acceptance tests
- `npm run build` succeeds.
- Typecheck succeeds.
- `/api/health` returns `{ "ok": true }`.
- Public route and authenticated dashboard shell render.
- A sample shadcn component is rendered using project tokens.
