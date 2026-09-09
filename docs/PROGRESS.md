# VIVR — Progress Log

## Phase 1 — Foundation (2026-09-08)

**Status:** Complete.

### Scope delivered

- Next.js 16 App Router + TypeScript (strict) foundation, bootstrapped in place.
- Tailwind CSS v4 with a shadcn/ui (new-york, zinc) theme.
- shadcn/ui primitives: `Button`, `Badge`, `Card`, `Skeleton`. Lucide icons.
- ESLint 9 (`eslint-config-next/core-web-vitals` + typescript) and Prettier.
- Zod environment validation (`src/lib/env`): app-level defaults plus a strict
  `DATABASE_URL` boundary used by database code.
- Drizzle ORM + `postgres` driver configuration, `drizzle-kit` setup, empty
  schema placeholder (business tables arrive in later phases), migration
  helper.
- Route groups: `(public)` marketing shell at `/`, `(dashboard)` shell at
  `/dashboard`, loading / error / not-found boundaries.
- `/api/health` returns `{ "ok": true }` (dynamic route).
- Package scripts: `lint`, `typecheck`, `test`, `test:watch`, `format`,
  `format:check`, `db:generate`, `db:migrate`, `check`.
- Vitest test suite (14 tests) covering env validation, `cn()`,
  `parseWithZod`, and the health route.

### Verification results

| Command            | Result |
| ------------------ | ------ |
| `pnpm test`        | PASS — 4 files, 14 tests |
| `pnpm lint`        | PASS |
| `pnpm typecheck`   | PASS |
| `pnpm build`       | PASS — routes: `/`, `/_not-found`, `/api/health`, `/dashboard` |
| `pnpm format:check`| PASS |
| `pnpm check`       | PASS (lint + typecheck + test + build) |

### Manual QA

- `pnpm start` boots and serves the app.
- `GET /api/health` → `200` with body `{"ok":true}`.
- `GET /` → `200`, public shell renders (VIVR branding, "Browse inventory").
- `GET /dashboard` → `200`, dashboard shell renders ("Workspace overview").
- `GET /nonexistent-page` → `404`, not-found boundary renders.

### Notes and limitations

- Database is not provisioned locally; `DATABASE_URL` is validated only at
  database boundaries. `/api/health` does not require it.
- No business tables exist yet. `src/server/db/schema.ts` is intentionally
  empty; inventory/import tables are out of scope for Phase 1.
- Clerk, PostgreSQL schema, and tests for tenant isolation arrive in Phase 2.
- No Git repository is initialized in this directory yet.
- The full architecture documents (`00_MASTER_AGENT_INSTRUCTIONS.md` through
  `12_EXECUTION_ROADMAP.md`) are not present in `/docs`; only the four
  `0X_*` OpenCode task documents were provided. Requirements were implemented
  from `docs/03_PHASE_01_OPEN_CODE_TASKS.md` Task 1 and the Phase 1 brief.

### Environment variables introduced

- `NEXT_PUBLIC_APP_URL` — example in `.env.example`.
- `DATABASE_URL` — example in `.env.example` (secret, placeholder value only).

### Open decisions

- Database deployment target (local Postgres vs. managed provider).
- Platform-admin source of truth (Clerk metadata vs. DB table) — Phase 2
  stop condition.
- Whether the expected inventory range `0001`–`2000` is finalized.

---

## Phase 2 — Clerk Authentication + B2B Multi-Tenancy (2026-09-09)

**Status:** Complete.

### Scope delivered

- `@clerk/nextjs@7.9.1` (Clerk Core 3) installed with `@clerk/ui@1.32.2`
  shadcn theme integration.
- `src/proxy.ts` — `clerkMiddleware()` proxy file (Next.js 16 convention)
  with Clerk's recommended matcher (routes under `/`, `/api`, `/trpc`,
  `/__clerk` matched; static assets, not-found, internal paths excluded).
- `src/config/auth.ts` — single source of truth for B2B Organization roles:
  `org:admin`, `org:editor`, `org:operator`, `org:analyst`, `org:member`.
- `src/server/auth/index.ts` — server-side auth helpers:
  `getAuthContext()`, `requireAuth()`, `requireOrganization()`,
  `requireOrganizationRole(allowedRoles)`, `getCurrentActor()`.
  All helpers derive identity from `auth()` and `currentUser()` only; no
  client-supplied identifiers are trusted. Throws `AuthContextError` with
  typed codes (`unauthenticated`, `missing_organization`, `insufficient_role`).
- `src/app/(public)/layout.tsx` — Clerk `<Show>` component (Core 3 replacement
  for `<SignedIn>/<SignedOut>`) renders sign-in/sign-up or dashboard link
  in the nav.
- `src/app/(public)/sign-in/[[...sign-in]]/page.tsx` and
  `sign-up/[[...sign-up]]/page.tsx` — Clerk `<SignIn/>` / `<SignUp/>` with
  metadata.
- `src/app/(dashboard)/layout.tsx` — `await auth.protect()` gates all
  dashboard routes; redirects unauthenticated document requests to Clerk
  handshake → `/sign-in`.
- `src/components/layout/dashboard-shell.tsx` — header with Clerk
  `OrganizationSwitcher` (hide personal, redirect to `/dashboard` after
  create/select) and `UserButton` with a "Star numbers" link.
- `src/app/(dashboard)/dashboard/page.tsx` — renders actor org state via
  `getCurrentActor()`, shown workspace-placeholder UI.
- `src/app/api/actor/route.ts` — protected API route pattern; returns
  `401 {"error":"unauthenticated"}` or `200` with actor JSON.
- `src/app/layout.tsx` — wrapped in `<ClerkProvider appearance={{ theme: shadcn }}>`.
- `src/styles/globals.css` — `@import "@clerk/ui/themes/shadcn.css"`.
- Tests: `src/server/auth/index.test.ts` (20 tests), `src/config/auth.test.ts`
  (3 tests), `src/app/api/actor/route.test.ts` (3 tests) — 26 new tests total.
- `.env.example` updated with routing URL vars; `.env.local` updated with
  `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `..._SIGN_UP_URL`, `..._FALLBACK_REDIRECT_URL`.

### Verification results

| Command          | Result |
| ---------------- | ------ |
| `pnpm test`      | PASS — 7 files, 40 tests |
| `pnpm lint`      | PASS |
| `pnpm typecheck` | PASS |
| `pnpm build`     | PASS — ƒ Proxy (Middleware) registered; routes: `/`, `/_not-found`, `/api/actor`, `/api/health`, `/dashboard`, `/sign-in/[[...sign-in]]`, `/sign-up/[[...sign-up]]` |
| `pnpm check`     | PASS |

### Manual QA (production server)

- `GET /` — 200, public shell with sign-in / sign-up nav (signed-out).
- `GET /api/health` — 200 `{"ok":true}`.
- `GET /api/actor` — 401 `{"error":"unauthenticated"}`.
- `GET /dashboard` (browser, Sec-Fetch-Dest: document) — 307 redirect to
  Clerk handshake → sign-in. (Correct.)
- `GET /dashboard` (App Router client nav, Next-Url header) — 307 redirect.
  (Correct.)
- `GET /sign-in` — 200, Clerk `<SignIn/>` renders.
- `GET /sign-up` — 200, Clerk `<SignUp/>` renders.
- Clerk middleware log: 0 errors on startup or request processing.

### Known behaviors (non-issues)

- `auth.protect()` in a layout sets `x-clerk-auth-status: signed-out` for
  signed-out document requests. Next.js streaming returns 200 with the
  not-found boundary content embedded in the RSC flight payload (status
  cannot be changed after headers are flushed). Real browsers receive the
  307 redirect. No sensitive data is in the dashboard page for signed-out
  actors (the page shows only the "Select or create an organization"
  placeholder).
- Dev-mode `dev-browser-missing` handshake redirects are normal behavior
  in `next dev`; production Clerk deployment will use cookie-based sessions.

### Limitations

- No business tables or DB queries yet; `src/server/db/schema.ts` remains
  empty placeholder.
- Organization roles are Clerk-side only; no server-side DB-backed role
  cache (Phase 3+).
- `pnpm-workspace.yaml` `allowBuilds` values (`bufferutil`, `core-js`,
  `utf-8-validate`) set to `false`; native module builds disabled.

### Open decisions carried forward

- Database deployment target (local Postgres vs. managed provider).
- Platform-admin source of truth (Clerk metadata vs. DB table).
- Star-number inventory range `0001`–`2000` confirmation.

---

## Phase 3 — PostgreSQL Schema + Drizzle Repositories (2026-09-09)

**Status:** Complete.

### Scope delivered

- `src/config/starNumbers.ts` — single source of truth for canonical machine
  values: star-number categories (`silver`, `gold`, `platinum`, `diamond`),
  lifecycle statuses (`available`, `reserved`, `sold`, `suspended`,
  `released`, `retired`), `^[0-9]{4}$` code pattern, format version 1, import
  modes (`dry_run`, `commit`), batch statuses (`started`, `completed`,
  `failed`), row results (`accepted`, `rejected`, `duplicate`, `missing`,
  `conflict`), plus `is*` guards.
- `src/server/db/schema.ts` → re-exports table modules:
  - `schema/organizations.ts` — `organizations`: app-side Clerk org mirror,
    `id` = Clerk org ID (external tenant ID), unique `slug`.
  - `schema/actors.ts` — `actors`: user+organization pair, unique
    `(user_id, organization_id)`, FKs to `organizations`.
  - `schema/star-numbers.ts` — `star_numbers`: platform-level canonical
    inventory. `number_code` text with leading zeroes preserved; unique
    `number_code` and `display_number`; `display_number` derived (`'*' ||
    number_code`) via check constraint; `format_version >= 1`; category/status
    check constraints; `memorability_score`, `pattern_tags` jsonb,
    `source_batch_id` FK.
  - `schema/inventory-imports.ts` — `inventory_import_batches` (source name,
    hash, mode, status, summary JSON, `actor_id` FK) and
    `inventory_import_rows` (`batch_id` FK, line number, raw/normalized JSON,
    result, error code/message; unique `(batch_id, line_number)`).
- `src/server/db/schema.ts` barrel re-exports all four table modules.
- `src/server/db/index.ts` — exposes `Database` / `Db` (typed Drizzle query
  client) and `createDatabase()`; raw PostgreSQL client never leaves the db
  module.
- `src/server/repositories/` — `createOrganizationRepository` (upsert from
  Clerk webhook/session data, find by id/slug, list), `createActorRepository`
  (find-or-create by `(user_id, organization_id)`, org/user listings),
  `createStarNumberRepository` (create, find by code/display/code-or-display,
  prefix search on number_code, category/status filter, paginated list, count,
  status transition; enforces code/category/status validation and derives
  display_number — never editable independently), `createInventoryImportRepository`
  (create batch, row writes with raw/normalized JSON and per-row result,
  batch/rows queries, summary JSON update, status completion).
- Platform-level (non-tenant) tables (star_numbers, inventory imports) carry
  no `organization_id`; tenant context arrives with ownership/reservation
  tables in later phases. Tenant-owned tables (organizations, actors) enforce
  the tenant boundary in the repository layer.
- DB check constraints enforce canonical category/status/mode/result values;
  uniqueness is enforced at the database level (`uniqueIndex`).

### Migrations

- `drizzle/0001_odd_beast.sql` — creates all 5 tables, FKs, indexes, check
  constraints. `pnpm db:generate` reports "No schema changes" (idempotent);
  `pnpm db:migrate` is idempotent (skips already-applied migrations).
- Applied to `vivr_dev` (dev database).

### Tests

- `src/config/starNumbers.test.ts` — canonical values, pattern, guards
  (6 unit tests).
- `src/server/repositories/star-numbers.integration.test.ts` —
  display_number derivation, leading-zero preservation, global uniqueness,
  invalid-value rejection, code/display lookup, leading-zero-ordered
  pagination, prefix search, category/status filters, counts, lifecycle status
  transition without deletion (11 integration tests) against `vivr_test`.
- `src/server/repositories/inventory-imports.integration.test.ts` — org
  mirror upsert, unique slug, actor scoping/idempotency, batch create + row
  outcomes, dry-run/commit + completion, shared source hash across batches,
  canonical mode rejection, star number → source batch linkage, batch summary
  JSON (16 integration tests) against `vivr_test`.
- `src/server/db/testing.ts` — dedicated `vivr_test` database helper
  (`connectTestDatabase`, `resetDatabase`). `vivr_test` is migrated once via
  `pnpm db:migrate` with `DATABASE_URL` set to the `vivr_test` URL
  (superuser `vivr_app` created the database).
- `vitest.config.ts` — `fileParallelism: false` so integration-test files
  never truncate the shared `vivr_test` tables concurrently.

### Verification results

| Command            | Result |
| ------------------ | ------ |
| `pnpm db:generate` | PASS — 5 tables, no schema changes on re-run |
| `pnpm db:migrate`  | PASS — idempotent against `vivr_dev` and `vivr_test` |
| `pnpm test`        | PASS — 10 files, 67 tests |
| `pnpm lint`        | PASS |
| `pnpm typecheck`   | PASS |
| `pnpm build`       | PASS — routes unchanged from Phase 2 |
| `pnpm check`       | PASS (lint + typecheck + test + build) |

### Notes and limitations

- No reservations, orders, ownership transfers, renewals, invoicing, or
  customer-facing inventory views yet (all later phases).
- `star_number_category` table intentionally not created: docs/01 defines
  category as descriptive machine values enforced via check constraints and
  config, not through a relational entity.
- Deletion is not exposed through repositories; lifecycle transitions use
  `status`. Import row/batch tables have no cascade deletes (platform
  maintenance).
- Repository `deleteById` (organizations, actors) exists for maintenance use;
  it is not part of product flows.

### Environment variables introduced

- None new from `.env.local`; `vivr_test` database created locally as the
  dedicated integration-test database (created via superuser `vivr_app`).

### Open decisions carried forward

- Database deployment target (local Postgres vs. managed provider).
- Platform-admin source of truth (Clerk metadata vs. DB table).
- Whether the expected inventory range `0001`–`2000` is finalized.

---

## Phase 4 — Existing OSSK Star-Number Core: Inventory Import (2026-09-09)

**Status:** Complete.

### Scope delivered

- **Import parsing** — `src/server/services/inventory/parsers.ts`: line
  parser (skips `#` comments, Markdown separator rows, header row, blanks),
  content-driven cell splitting (pipe or comma), and row normalization.
  Leading zeroes are preserved (`number_code` stays TEXT); `display_number`
  is always the derived `*` + code; status/category are normalized to
  canonical machine values; per-row error codes (`invalid_number_code`,
  `invalid_status`, `invalid_category`, `missing_number_code`,
  `unexpected_columns`).
- **Import service** — `src/server/services/inventory/importService.ts`:
  `runInventoryImport()` reads the two source files from a configurable
  source directory, hashes source content (sha256), parses + normalizes,
  classifies rows (`accepted`/`rejected`/`duplicate`), computes missing codes
  within an optional expected range (string-based, never integer-coerced),
  resolves conflicts against the current inventory (read-only), and writes
  `inventory_import_batches` + `inventory_import_rows`.
  - DRY RUN: writes only batch + row outcomes; `star_numbers` is never
    modified.
  - COMMIT: upserts `star_numbers` for accepted rows via `createIfAbsent`
    (idempotent, safe to re-run); refuses entirely (batch `failed`) when any
    row is rejected or is a within-source duplicate.
  - Conflict policy (docs/02): unknown codes create; identical rows no-op;
  category change on `available` records requires the explicit
  `allowCategoryUpdate` import flag; source-stale `available` never downgrades
  an advanced lifecycle status (`status_downgrade_protected`); status
  transitions are never performed by imports (`status_conflict`,
  `category_conflict`).
  - Summary (`ImportBatchSummaryDetail`) records accepted/rejected/duplicate/
  conflict/missing counts, missing codes (e.g. `1234`), created/updated/
  alreadyPresent, and `alreadyProcessed` (source hash already committed).
- **Platform-admin gate** — `src/config/auth.ts`: `PLATFORM_ADMIN_METADATA_KEY`
  (`platformAdmin`) + `isPlatformAdmin()` (strict boolean). `src/server/auth`:
  `requirePlatformAdmin()` (returns userId), `requirePlatformAdminContext()`
  (userId + active organization for the auditing actor),
  `platformAdminErrorResponse()`. Admin source of truth = Clerk user
  public-metadata flag (no PG tables added).
- **Repository additions** — `star_numbers.createIfAbsent()`,
  `updateCategory()`, `findByNumberCode()` (read via service);
  `inventory-imports.listBatches()`, `ImportBatchSummaryDetail` (writable to
  `summary_json`). No raw SQL in the service; all mutations go through
  repositories.
- **CLI** — `src/scripts/inventory-import.ts` (`pnpm inventory:import`):
  `--mode dry_run|commit`, `--source-dir`, `--expected-start/--expected-end`,
  `--allow-category-update`, `--actor-user-id/--actor-org-id` (or
  `IMPORT_ACTOR_USER_ID`/`IMPORT_ACTOR_ORG_ID`), `--list`. Prints a
  human-readable summary; never prints credentials or `DATABASE_URL`.
- **Platform-admin API** — `src/app/api/admin/inventory/import` (POST), 
  `.../imports` (GET, recent batches), `.../imports/[batchId]` (GET, batch +
  rows). All gated on `requirePlatformAdminContext()` (401 unauthenticated,
  403 not platform admin, 400 missing org). Request body accepts mode /
  expected range / allowCategoryUpdate; source paths are server-side defaults
  only.

### Tests

- `src/server/services/inventory/parsers.test.ts` — cell splitting,
  header/separator/comment skipping, leading-zero preservation, derived
  display form, invalid value errors (12 unit tests).
- `src/server/services/inventory/importService.unit.test.ts` —
  `enumerateCodeRange` (8 unit tests).
- `src/server/services/inventory/importService.integration.test.ts` —
  dry run writes no star_numbers, commit creates star_numbers with leading
  zeroes + derived display, idempotent re-run, invalid-value and within-source
  duplicate rejection (commit `failed`, no star_numbers), no-downgrade
  conflict, category-update gating, deterministic per-run batches (8
  integration tests against `vivr_test`).
- `src/server/auth/index.test.ts` — `requirePlatformAdmin` /
  `requirePlatformAdminContext` (+6 tests).
- Route tests — `src/app/api/admin/inventory/import/route.test.ts` (9),
  `.../imports/route.test.ts` (3), `.../imports/[batchId]/route.test.ts` (5).

### Verification results

| Command                              | Result |
| ------------------------------------ | ------ |
| `pnpm test`                          | PASS — 16 files, 118 tests |
| `pnpm lint`                          | PASS |
| `pnpm typecheck`                     | PASS |
| `pnpm build`                         | PASS — routes added: `/api/admin/inventory/import`, `/api/admin/inventory/imports`, `.../imports/[batchId]` |
| `pnpm check`                         | PASS (lint + typecheck + test + build) |
| `pnpm db:generate`                   | PASS — no schema changes |
| `pnpm inventory:import --mode dry_run --expected-start 0001 --expected-end 2000` | PASS — 1999 accepted, 0 rejected/duplicate/conflict, missing 1 (`1234`); star_numbers untouched |
| `pnpm inventory:import --list`       | PASS — batch persisted with summary |

### Notes and limitations

- Imported data verified: part-01 (`0001`–`0999`, 999 rows) + part-02
  (`1000`–`2000`, 1000 rows) = 1999 rows; `1234` is the documented missing
  code and is reported, never auto-created.
- The import service requires the organization mirror row to exist (session/
  webhook sync responsibility) because `inventory_import_batches.actor_id`
  references `actors`, which references `organizations`.
- The CLI is a local operator tool (identity from flags/env); the
  platform-admin gate is enforced on the API surface.
- Missing codes are reported in the summary (no source line exists), not as
  `inventory_import_rows`; `missing` is a summary count only.
- Out of scope (later phases): customer inventory UI, reservations, orders,
  ownership, renewals, pricing, billing, customer dashboards, VIVR
  builder/runtime, LiveKit/SIP/AI routing.

### Open decisions carried forward

- Database deployment target (local Postgres vs. managed provider).
- Whether the expected inventory range `0001`–`2000` is finalized.
- Customer-facing star-number presentation and pricing (Phase 5+).

## Phase 5 — Customer Dashboard (2026-09-09)

**Status:** Complete.

### Scope delivered

- **Tenant dashboard** — `src/server/dashboard/tenant.ts` loaders +
  `(dashboard)` pages:
  - `/dashboard` reviews the active organization (name/slug/role) with
    read-only platform-inventory counts (total + per category).
  - `/dashboard/star-numbers` lists the read-only platform inventory with
    server-driven filters (prefix `q`, `category`, `status`) and pagination
    (`page`, 25 rows/page). Pages are labeled "Platform inventory"; ownership
    arrives in later phases.
- **Admin dashboard** — `src/server/dashboard/admin.ts` loaders + `(admin)`
  group:
  - `/admin/inventory/imports` lists recent import batches (source, mode,
    status, started, key outcome counts).
  - `/admin/inventory/imports/[batchId]` shows batch summary + structured row
    outcomes (line, number, category, status, result, error) derived from the
    stored JSON — raw blobs are never rendered.
- **RBAC / tenancy** — `(dashboard)` layout uses `auth.protect()` and
  resolves the platform-admin flag server-side to conditionally show admin
  nav. Tenant loaders resolve the organization strictly from the Clerk
  session (`requireOrganizationRole` with all recognized roles); an
  authenticated user without an active organization gets a friendly "select an
  organization" state. `(admin)` layout: `auth.protect()` redirects
  signed-out users, `requirePlatformAdmin()` fails closed for non-admins with a
  dedicated error boundary. Non-throwing `isCurrentUserPlatformAdmin()`
  helper added for nav rendering only.
- **UI** — new `Table` primitive; `Overview`, `StarNumbersTable`,
  `ImportBatchesTable`, `ImportBatchDetail` presentational components;
  `AdminShell`; loading/error/not-found boundaries for the `(admin)` group.
  No Drizzle access from React; all data flows through repositories via the
  dashboard loaders.

### Tests

- `src/server/auth/index.test.ts` — `isCurrentUserPlatformAdmin` (+4 tests).
- `src/server/dashboard/tenant.test.ts` — tenant context resolution, missing-
  org empty state, role-gated loaders, filter validation, page clamping,
  session-derived tenancy (12 unit tests, mocked auth + DB).
- `src/server/dashboard/admin.test.ts` — admin context required before DB,
  batch listing + summary parsing, structured row derivation, not-found, RBAC
  rejection (6 unit tests).
- `src/components/dashboard/*.test.tsx` — rendering tests for Overview,
  StarNumbersTable, ImportBatchesTable, ImportBatchDetail via
  `renderToStaticMarkup` (20 tests; no new test deps).

### Verification results

| Command                        | Result |
| ------------------------------ | ------ |
| `pnpm test`                    | PASS — 22 files, 160 tests |
| `pnpm lint`                    | PASS |
| `pnpm typecheck`               | PASS |
| `pnpm build`                   | PASS — routes added: `/dashboard`, `/dashboard/star-numbers`, `/admin/inventory/imports`, `/admin/inventory/imports/[batchId]` |
| `pnpm check`                   | PASS (lint + typecheck + test + build) |
| `pnpm db:generate`             | PASS — no schema changes, no new migrations |

### Notes and limitations

- No new tables, migrations, API routes, or secrets: only read-only UI built
  on the Phase 3/4 repositories.
- `(admin)` is a route group whose pages live under `(admin)/admin/...` so the
  URL is `/admin/inventory/imports` (route groups do not add path segments).
- Import batch views are read-only; import execution stays on the CLI/API.
- Dev database note: `star_numbers` is still empty and only the Phase 4
  dry-run batch exists, so the admin batch list shows that batch and tenant
  inventory tables render the empty state until a COMMIT is run.
- Out of scope (later phases): reservations, orders, ownership, renewals,
  pricing, billing, customer inventory workflows, VIVR builder/runtime.

### Open decisions carried forward

- Database deployment target (local Postgres vs. managed provider).
- Whether the expected inventory range `0001`–`2000` is finalized.
- Customer-facing star-number presentation and pricing (Phase 6+).