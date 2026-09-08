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

## Clerk setup
Follow the current Clerk Next.js App Router integration. For Next.js 16+, use `proxy.ts` for Clerk middleware; for Next.js 15 and earlier, the equivalent file is `middleware.ts`.

## Acceptance tests
- Sign in/out works.
- Organization creation/switching works.
- An invited member sees the correct organization.
- Cross-tenant access tests fail safely.
- Role-protected routes and actions are enforced server-side.
