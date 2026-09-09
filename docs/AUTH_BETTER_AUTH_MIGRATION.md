# Better Auth Migration — Clerk → Self-Hosted Auth (Completed)

**Phase:** Auth provider migration (post-Phase 6)
**Date:** 2026-09-09
**Status:** Complete

## What changed

Replaced Clerk Authentication + Clerk Organizations with self-hosted
Better Auth (`better-auth@1.7.3`) running on the application's own
PostgreSQL database via the official `@better-auth/drizzle-adapter`.

All Phase 1–6 functionality (star-number inventory import, tenant dashboards,
VIVR builder) is preserved. This was a provider swap only; no business or
VIVR runtime behavior changed.

## Architecture

```
Browser
  │  better-auth.session_token cookie
  ▼
src/proxy.ts ── getSessionCookie(request)  (optimistic cookie gate, no DB)
  │
  ▼
App Router: pages / server actions / route handlers
  └── src/server/auth/index.ts helpers
        ├── auth().api.getSession({ headers })   (validates session)
        └── loadMembership()                     (member-table proof)
       Throws AuthContextError{code} → 401/403/400
```

- **`src/lib/auth.ts`** — `betterAuth({ database: drizzleAdapter(db, …) })`.
  `usePlural: false` so config schema keys (singular) match Better Auth's
  internal model names. `organization: organizations` maps the plugin's
  `organization` model onto the existing Phase-3 `organizations` table
  (adding nullable `logo` and `metadata` columns).
- **Tables** (SQL names, generated to match `getAuthTables()` exactly):

  | Model   | Table          | Key fields |
  | ------- | -------------- | ---------- |
  | user    | `user`         | `email` unique, `platform_role` ('user'/'platform_admin', CHECK) |
  | session | `session`      | `token` unique, `active_organization_id` |
  | account | `account`      | `provider_id`+`account_id` unique, `password` (hashed) |
  | verification | `verification` | `identifier` |
  | organization | `organizations` (reused) | `slug` unique, `logo`, `metadata` |
  | member  | `member`       | `user_id`+`organization_id` unique, `role` default `org:member` |
  | invitation | `invitation`  | `email`, `status`, `expires_at` |

- **Relations** — `src/server/db/schema/relations.ts` defines the relational
  query joins the org plugin uses. With `usePlural: false`, join relation
  keys resolve to `${joinModel}s`, so member/invitation relations are named
  `organizations` and `users`. These are TypeScript-only; no SQL objects.
  Both `createDatabase()` and `connectTestDatabase()` merge them into the
  drizzle schema.

## Adapter settings (important)

- `usePlural: false` — paths off the runtime schema-diff check
  (a `usePlural: true` config with singular schema keys throws
  `SchemaMismatchError`, because expected table names come out plural while
  the introspected config keys are singular).
- Config schema keys are the singular Better Auth model names:
  `user, session, account, verification, organization, member, invitation`.
- Member role values are the application's own keys
  (`org:admin/editor/operator/analyst/member`), stored as plain strings;
  `firstApplicationRole()` handles Better Auth's comma-separated multi-roles.

## Roles & authorization

- **Organization roles** — `src/config/auth.ts`: `organizationRoles` maps the
  five B2B roles to `organizationAccessControl` statements (default org
  statements + `vivr`/`operations`/`analytics` resources). `creatorRole:
  "org:admin"` makes the org creator an admin.
- **Platform admin** — a separate `user.platform_role` column
  (`platform_admin`), database-backed and never self-service. Promoted only
  via the dev-only CLI:
  `pnpm auth:promote-admin --email user@example.com [--role platform_admin|user] [--list]`.
- **Server-side proof** — the active organization from the session is only
  trusted when a matching `member` row exists for `(user_id, organization_id)`
  (`loadMembership`). Browser-supplied org IDs are never consulted.

## Migration notes

- `drizzle/0002_odd_sheva_callister.sql` contains all auth tables + the
  `organizations.logo`/`metadata` columns.
- **CORRECTION (2026-09-09, migration audit):** the reserved-word
  explanation below was disproven by the audit. Quoted identifiers are valid
  PostgreSQL, and `CREATE TABLE "user"` applies cleanly. The real cause of the
  original failure is a **duplicate index name**: `src/server/db/schema/user.ts`
  declares both `email.text(...).unique()` (which emits `CONSTRAINT
  "user_email_unique" UNIQUE(email)` inside `CREATE TABLE "user"`) and an
  explicit `uniqueIndex("user_email_unique")` (which emits a separate
  `CREATE UNIQUE INDEX "user_email_unique"` at the end of the migration).
  On a fresh database the second statement fails with
  `relation "user_email_unique" already exists`. Because of this,
  **`pnpm db:migrate` is NOT clean-DB reproducible** without manual
  intervention: both `vivr_dev` and `vivr_test` were brought to the identical,
  correct schema manually (tables, FKs, indexes, CHECKs) and the migration
  marked applied; `pnpm db:migrate` is now idempotent and reports nothing new
  on those already-migrated databases only.
- Verify table presence with:
  `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;`
  → 13 tables (7 Phase 1–6 + 6 auth), plus `__drizzle_migrations`.

## Verification

| Check | Result |
| ----- | ------ |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS — 26 files, 194 tests |
| `pnpm build` | PASS (retry if `fonts.gstatic.com` times out transiently) |
| Clerk grep (`@clerk`, `ClerkProvider`, `clerkMiddleware`, `useAuth`, `useUser`) | 0 matches |
| `pnpm db:migrate` | PASS — idempotent on already-migrated `vivr_dev`/`vivr_test`; NOT clean-DB reproducible (see corrected Migration notes) |

## Known limitations

- No email provider configured: email verification and org-invitation emails
  are stored (verification table, invitation table) but never sent.
- Google OAuth vars exist in `.env.example` but are empty; do not enable an
  incomplete provider.
- `BETTER_AUTH_SECRET` must be a strong random secret — validated at the
  server auth boundary (`getAuthEnv`); never expose to the browser.

## Rollback

Not applicable post-completion. The previous Clerk state was not preserved
(the migration is a forward-only source-of-truth change); Phase 2's Clerk
`auth.protect()` and `publicMetadata.platformAdmin` patterns no longer exist.