# Phase 02 — Clerk Authentication and B2B Multi-Tenancy

## Goal
Implement secure authentication and organization-based tenant isolation using Clerk.

## Clerk model
Use Clerk Organizations as the application tenant boundary. A user may belong to multiple organizations; the active organization determines the tenant context.

Recommended application roles:
- `org:admin` — full organization administration.
- `org:editor` — create/edit/publish VIVRs and content.
- `org:operator` — manage calls, routing, destinations and operational settings.
- `org:analyst` — analytics/read-only reporting.
- `org:member` — normal customer access.

Keep the exact Clerk role naming in one configuration file.

## Database pattern
All tenant-owned tables include:
```sql
organization_id text not null
```

Use Clerk organization IDs as external tenant identifiers. Do not make application users the tenant boundary.

Create application profile tables only for data that PostgreSQL must own. Do not duplicate unnecessary Clerk identity data.

## Required server helpers
Implement:
- `requireAuth()`
- `requireOrganization()`
- `requireOrganizationRole()`
- `getCurrentActor()`

Every protected Server Action/Route Handler must validate the active Clerk organization and role before mutation.

## Security requirements
- Never accept `organization_id` from the browser as authorization.
- Never rely only on hidden UI controls for authorization.
- Verify permissions server-side.
- Use Postgres constraints to prevent cross-tenant foreign-key mistakes.
- Add integration tests proving Organization A cannot read/write Organization B data.

## Required environment variables

The Clerk Next.js App Router integration requires exactly two credentials. Both are
written by `npx clerk@latest init` / `npx clerk@latest env pull` into `.env.local`;
do not invent or commit values.

| Variable | Required | Secret | Usage |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | No (public, prefixed `pk_test_` / `pk_live_`) | Frontend Clerk provider; safe in client bundles |
| `CLERK_SECRET_KEY` | Yes | Yes (prefixed `sk_test_` / `sk_live_`) | Server-side auth and Backend API; never expose to the browser |

Optional routing variables only; they configure Clerk-hosted sign-in/sign-up URLs and
must not be invented if the corresponding UI is not implemented: `NEXT_PUBLIC_CLERK_SIGN_IN_URL`,
`NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`,
`NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`.

Rules:
- Add the variables to a local env file (e.g. `.env.local`) with real values; never commit them.
- `CLERK_SECRET_KEY` must never be referenced from client code or a `NEXT_PUBLIC_` variable.
- If `npx clerk` is unavailable, prompts that request credentials must be treated as a blocker.

## Clerk setup
Follow the current Clerk Next.js App Router integration. For Next.js 16+, use `proxy.ts` for Clerk middleware; for Next.js 15 and earlier, the equivalent file is `middleware.ts`.

## Acceptance tests
- Sign in/out works.
- Organization creation/switching works.
- An invited member sees the correct organization.
- Cross-tenant access tests fail safely.
- Role-protected routes and actions are enforced server-side.
