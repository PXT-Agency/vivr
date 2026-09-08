# Phase 01 OpenCode Tasks — Inventory Foundation

## How to use this file

Give OpenCode one task at a time. Do not paste the entire roadmap as a single implementation request. After each task, review the completion report before starting the next task.

## Task 1 — Repository and foundation

### Goal

Create the production foundation without business workflows.

### In scope

- Next.js App Router with TypeScript.
- Tailwind and shadcn/ui.
- ESLint, Prettier, strict TypeScript.
- Drizzle ORM configuration.
- PostgreSQL connection.
- Environment validation.
- `/api/health`.
- Error, loading, and not-found boundaries.
- Basic public shell and protected dashboard shell.
- CI commands for lint, typecheck, test, and build.

### Out of scope

- Inventory tables.
- Clerk organization workflows.
- VIVR.
- LiveKit.
- Billing.

### Acceptance criteria

- `pnpm lint` passes.
- `pnpm typecheck` passes.
- `pnpm test` passes.
- `pnpm build` passes.
- `/api/health` returns `{ "ok": true }`.
- No secrets are committed.
- Environment validation fails clearly when required variables are absent.

## Task 2 — Clerk tenant and platform-admin context

### Goal

Implement authentication helpers and distinguish customer organization roles from platform-admin authorization.

### Required helpers

- `requireAuth()`.
- `requireOrganization()`.
- `requireOrganizationRole()`.
- `getCurrentActor()`.
- `requirePlatformAdmin()`.

### Acceptance criteria

- A user can authenticate.
- Active organization context is resolved server-side.
- Organization IDs from request bodies are ignored for authorization.
- Organization A cannot access Organization B data.
- Customer `org:admin` is not automatically a platform administrator.
- Tests cover unauthorized, wrong-role, missing-organization, and cross-tenant cases.

### Stop condition

Stop if the platform-admin source of truth is not decided. Do not invent a role implementation silently.

## Task 3 — Inventory schema

### Goal

Create the minimal database model for star-number inventory and import batches.

### In scope

- `star_numbers`.
- `inventory_import_batches`.
- `inventory_import_rows`.
- Canonical enums or validated text values.
- Unique constraints.
- Timestamps.
- Migration and seed strategy.

### Required invariants

- `number_code` is unique text.
- `display_number` is unique text.
- Number codes preserve leading zeroes.
- Initial number codes are exactly four digits.
- Category is one of silver, gold, platinum, diamond.
- Initial status is available.
- Inventory records are not physically deleted for lifecycle operations.

### Acceptance criteria

- Migration succeeds on a clean database.
- Migration can be applied in CI.
- Invalid values fail validation.
- Duplicate number codes fail safely.
- Tests cover the invariants.

## Task 4 — Import parser and dry run

### Goal

Parse the supplied Markdown and CSV inventory sources without mutating the database.

### In scope

- Source discovery.
- Markdown-table parsing.
- CSV parsing.
- Normalization.
- Row-level validation.
- Duplicate detection.
- Expected-range gap detection.
- Human-readable dry-run report.

### Acceptance criteria

- The supplied files can be parsed.
- `*0001` becomes code `0001`.
- `0001` becomes display `*0001`.
- Categories and statuses normalize consistently.
- `1234` is reported as missing if absent from the expected `0001`–`2000` range.
- Malformed rows are reported with source location.
- Dry run does not write database rows.

## Task 5 — Idempotent commit importer

### Goal

Commit validated inventory rows safely and repeatably.

### In scope

- Import batch creation.
- Source hash.
- Row-level import results.
- Idempotent insert behavior.
- Conflict detection.
- No status downgrade.
- Audit logging.

### Acceptance criteria

- A valid import creates inventory rows.
- Repeating the same import creates no duplicates.
- Existing reserved or sold records are not downgraded.
- Conflicts are visible to an administrator.
- Failed imports are not reported as successful.
- Import results can be reviewed after completion.

## Task 6 — Inventory administration read path

### Goal

Give authorized platform administrators a searchable inventory view.

### In scope

- Paginated table.
- Exact and prefix search.
- Category filter.
- Status filter.
- Sort by number code.
- Detail view.
- Import batch history.

### Acceptance criteria

- Search preserves leading zeroes.
- Public display preserves `*`.
- Pagination is server-side.
- Unauthorized users cannot access the route or server action.
- Empty results and import conflicts are clear.
- Queries are scoped correctly and tested.

## Required final report

```text
Task completed:
Files changed:
Routes added:
Database migrations:
Environment variables:
Commands executed:
Tests and results:
Manual QA performed:
Known limitations:
Open decisions:
```
