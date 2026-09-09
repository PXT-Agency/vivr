# Auth Migration & VIVR Phase 6 — Audit Report (2026-09-09)

**Audit:** Clerk → Better Auth + Phase 6 VIVR builder
**Verdict:** `NOT READY — MIGRATION AUDIT BLOCKERS REMAIN`

The blocker is narrow and well-understood: migration history **0002 is not
clean-DB reproducible** (duplicate `user_email_unique` index name). Everything
else — live schemas, data, authz, secrets, checks — passed.

---

## 1. Migration history and journal consistency

- `drizzle/meta/_journal.json` has 3 entries, `when` ascending:
  `0001_odd_beast` (1788924032575), `0001_watery_klaw` (1788945806360),
  `0002_odd_sheva_callister` (1788975484744).
- Exactly 3 SQL files exist; journal ↔ files are consistent.
- `drizzle/meta/` has `0001_snapshot.json` and `0002_snapshot.json`
  (0002 snapshot covers all 13 tables; 0001 snapshot is the pre-auth state).
- `drizzle.config.ts` is standard drizzle-kit config with the `drizzle/meta`
  folder; `src/server/db/migrate.ts` runs the `drizzle-orm` file-based
  migrator inside a transaction per migration. **PASS.**

## 2. Reproducibility test (temporary database) — **FAIL**

Behavioral verification on a scratch database, not reconstruction:

- Created a temporary database (`vivr_migration_audit`); ran `pnpm db:migrate`
  overriding `DATABASE_URL` only, so `vivr_dev`/`vivr_test` were never touched
  (verified `process.loadEnvFile` does not override already-set env vars).
- Result: **deterministic failure** at the last statement of 0002:
  `CREATE UNIQUE INDEX "user_email_unique" ON "user"` →
  `relation "user_email_unique" already exists`.
- Root cause: `src/server/db/schema/user.ts` declares `user.email` with
  `.unique()` (emits `CONSTRAINT "user_email_unique" UNIQUE(email)` inside
  `CREATE TABLE "user"`) **and** an explicit `uniqueIndex("user_email_unique")`
  (emits a second, independent `CREATE UNIQUE INDEX`). Both produce an index
  named `user_email_unique`; the second always collides on a fresh DB.
  The reserved word `user` is **NOT** the cause — quoted identifiers are valid
  PostgreSQL and `CREATE TABLE "user"` applies cleanly.
- Failure is transactional: the whole migration set rolled back
  (`public` empty), leaving only the `drizzle` schema +
  `__drizzle_migrations` (0 rows). Re-running fails again at the same
  statement — clean-DB reproducibility is **not achievable without manual
  intervention** or a schema fix + regeneration.
- The temporary database was dropped.

**Conclusion:** `pnpm db:migrate` is idempotent only on the already-migrated
`vivr_dev`/`vivr_test`; it cannot rebuild a database from scratch — the exact
condition the docs previously claimed was solved.

## 3. Runtime database state (vivr_dev)

- Introspected `user`, `session`, `account`, `verification`, `organizations`,
  `member`, `invitation`.
- Every column (names, types, nullability, defaults) matches the Drizzle
  schema exactly — including `user.platform_role` + CHECK, `session`
  `active_organization_id`, `organizations.logo`/`metadata`.
- Constraints, FKs and indexes match the schema: `member` has only the
  `user_id` FK (no FK on `organization_id`, matching the schema);
  `invitation` has only the `inviter_id` FK. `user_email_unique` exists once
  (as the constraint-backed index). **PASS.**

## 4. Data impact

- `vivr_dev`: all tables empty (organizations=0, user=0, member=0, session=0,
  vivrs=0, vivr_versions=0, star_numbers=0, inventory imports=0). No
  pre-migration data to lose; no live-auth data was migrated in (Clerk data was
  never in this Postgres). No data loss.
- `vivr_test`: organizations=2, vivrs=1, vivr_versions=1 (leftovers from the
  last integration case), everything else 0. Unrelated to the auth migration.
  **PASS — no data loss.**

## 5. Authorization and tenant isolation

- `src/server/actions/vivr.ts`: every mutation is gated by
  `requireOrganizationRole([...ORGANIZATION_EDITOR_ROLES])`; the org identity
  used is always the session/DB-derived organization, never a browser-supplied
  value.
- `src/server/dashboard/vivr.ts`: visibility restricted to
  `VIVR_VIEWER_ROLES` (= all five organization roles).
- `src/server/auth/index.ts` (`getAuthContext`, `requireAuth`,
  `requireOrganization`, `requireOrganizationRole`, `requirePlatformAdmin`):
  session + `member`-table membership proof; matches
  `src/config/auth.ts` roles (org:admin/editor/operator/analyst/member +
  `ORGANIZATION_EDITOR_ROLES`).
- `(admin)` layout: session required + `requirePlatformAdmin()`.
- Focused suites pass: auth (33), tenant (12), vivrService.integration (10),
  admin inventory routes (18), config/auth (3), lib/env (12). **PASS.**

## 6. Clerk references

- No runtime Clerk references: nothing in `src/`, `package.json`, or
  `pnpm-lock.yaml` matches `@clerk`.
- `OrganizationSwitcher` matches only the app's own component
  (`src/components/auth/organization-switcher.tsx`, built on
  `authClient.organization`).
- `publicMetadata` appears only as a doc comment in `user.ts`.
  **PASS.**

## 7. Secrets and environment safety

- `.env.local` is git-ignored (`.gitignore` has `.env*` + `!.env.example`);
  `.env.example` contains placeholders only.
- Exactly one `DATABASE_URL` line in `.env.local` (→ `vivr_dev`).
- Real `BETTER_AUTH_SECRET` value does not appear in any tracked file
  (`git grep -F` clean).
- `docs/env.download` is an untracked **legacy Clerk artifact** with stale
  `pk_test_...`/`sk_test_...` dev keys (not the real secret, not committed).
  Note it in later cleanup; it is not in the repo.
- `.backups/` contains pre-audit dump artifacts (untracked): `db-inspect.mjs`,
  `vivr_dev_pre_auth_migration.sql`, `vivr_test_pre_auth_migration.sql`.
  **PASS.**

## 8. Full checks

| Command | Result |
| ------- | ------ |
| `pnpm lint` | PASS — 0 warnings |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS — 26 files, 194 tests |
| `pnpm build` | PASS — full route map (public, dashboard, admin, `/api/auth/[...all]`, ƒ Proxy) |
| `pnpm check` | PASS (lint + typecheck + test + build) |
| `pnpm db:generate` | PASS — "No schema changes, nothing to migrate" (13 tables, no drift) |
| `pnpm db:migrate` (vivr_dev) | PASS — idempotent, reports nothing new |

Note: the schema-consistency of `db:generate` is a snapshot comparison only;
it does not exercise the clean-DB path that fails in §2.

## 9. Documentation corrections applied

- `docs/AUTH_BETTER_AUTH_MIGRATION.md` — replaced the reserved-word
  attribution with a labeled **CORRECTION**: real cause is the duplicate
  `user_email_unique` index (inline `.unique()` + explicit `uniqueIndex`),
  and `pnpm db:migrate` is **not clean-DB reproducible**.
- `docs/PROGRESS.md` — same labeled correction; verification table updated.
- Historical facts (what was run, that the schema was reconstructed manually
  and recorded as applied) were preserved; only the causal explanation and
  the reproducibility status were corrected.

---

## Blockers remaining

1. **MIGRATION-REPRO: `drizzle/0002_odd_sheva_callister.sql` is not clean-DB
   applicable.** Fix (post-audit): in `src/server/db/schema/user.ts`, keep a
   single declaration of `user_email_unique` (drop either the inline
   `.unique()` or the explicit `uniqueIndex("user_email_unique")`), then
   regenerate (`pnpm db:generate`) and re-verify on a scratch DB. This is a
   forward-only hash-preserving history change, intentionally **not** edited
   during the audit.