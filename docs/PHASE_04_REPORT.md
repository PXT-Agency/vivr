# OSSK + VIVR — Phase 4 (Existing OSSK Star-Number Core) Implementation Report

## 1. Import design

The import ingests the two provided OSSK inventory sources —
`docs/star-inventory-part-01-2.md` (`0001`–`0999`) and
`docs/star-inventory-part-02.csv` (`1000`–`2000`) — into the Phase 3
platform catalog (`star_numbers`) with a full audit trail
(`inventory_import_batches` + `inventory_import_rows`).

Source data was verified first: 1,999 clean rows with no malformed lines;
`1234` is confirmed absent from both files.

**Parsing.** Part 1 is Markdown-table formatted; part 2 is CSV but is
actually pipe-delimited. Both are parsed with content-driven separator
detection (pipe or comma). The parser skips `#` comment lines, Markdown
column-alignment separator rows, the `STAR NUMBER` header row, and blank
lines. Each source line becomes one row; the source file + physical line
number are preserved for audit.

**Normalization.** Every row is normalized into canonical machine values:
- `number_code` stays text with leading zeroes preserved (`0001`), never
  coerced to an integer.
- `display_number` is always derived in code as `*` + code; source display
  text is never trusted.
- Category and status are lowercased and validated against
  `src/config/starNumbers.ts` canonical values.
- Per-row error codes are attached (`invalid_number_code`, `invalid_status`,
  `invalid_category`, `missing_number_code`, `unexpected_columns`).

**Classification.** Rows are classified from source content alone:
- `accepted` — valid code/category/status, unique in the combined source.
- `rejected` — any validation error.
- `duplicate` — `number_code` (or derived display form) appearing more than
  once within the source.

**Missing detection.** When an expected range is provided (e.g. `0001`–`2000`),
codes in range with no source row are reported as missing and never
auto-created (test report: `1234`). Missing numbers have no source line, so
they are reported in the batch summary rather than as row records.

**Modes.** Two modes per docs/02:
- `dry_run` — writes batches + row outcomes only; `star_numbers` is never
  touched.
- `commit` — additionally upserts `star_numbers`; refuses entirely (batch
  `failed`) if any fatal validation errors (rejected or duplicate rows)
  exist.

## 2. Service implementation

`src/server/services/inventory/importService.ts` exposes
`runInventoryImport(db, options)`:

- Reads both files from a configurable `sourceDir` (default `docs`);
  file paths are never accepted from HTTP input.
- Hashes raw source content (sha256) via the batch `source_hash` so repeated
  sources can be flagged `alreadyProcessed`.
- Builds one batch per run (deterministic, idempotent across re-runs), with a
  unique `(batch_id, line_number)` per source line (part-2 line numbers are
  remapped past part-1 lines so the combined batch stays unique, with the
  physical line preserved in the raw JSON).
- Resolves each accepted row against current inventory (read-only):
  - unknown code → create;
  - identical (code, category, status) → no-op / `already_present`;
  - category change while status is `available` → allowed only when
    `allowCategoryUpdate` is set, otherwise `category_conflict`;
  - source-stale `available` against an advanced lifecycle status →
    `status_downgrade_protected` (never a downgrade);
  - any other status mismatch → `status_conflict` (imports never transition
    lifecycle status; that is a future domain-service responsibility).
- Commit applies resolutions via `star_numbers.createIfAbsent()` and
  `updateCategory()`, recording created/updated/alreadyPresent counts.
- Writes row outcomes (including for failed batches), persists the extended
  summary JSON, and marks the batch `completed` or `failed`.

All mutations go through the Phase 3 repositories
(`inventory-imports.ts`, `star-numbers.ts`, `actors.ts`); there is no raw SQL
in the service.

## 3. API/CLI surface

**Platform-admin source of truth (project decision):** Clerk user
public-metadata flag `data.platformAdmin: true`
(`src/config/auth.ts` → `isPlatformAdmin`, strict boolean). No PG tables were
added. `requirePlatformAdmin()` returns the Clerk userId;
`requirePlatformAdminContext()` additionally requires an active organization
(the auditing actor is `(user_id, organization_id)`).

**API routes** (all gated on `requirePlatformAdminContext()`; 401
unauthenticated, 403 non-admin, 400 no active org):
- `POST /api/admin/inventory/import` — body `{ mode?, expectedStart?,
  expectedEnd?, allowCategoryUpdate? }`; source paths are server-side
  defaults only. Returns the batch (id/mode/status/timestamps) + summary.
- `GET /api/admin/inventory/imports` — most-recent batches with summaries.
- `GET /api/admin/inventory/imports/[batchId]` — one batch with its rows
  (raw/normalized values, result, error code/message).

**CLI** (`pnpm inventory:import`, `src/scripts/inventory-import.ts`) — local
operator tool:
- `--mode dry_run|commit` (default `dry_run`), `--source-dir`,
  `--expected-start/--expected-end`, `--allow-category-update`, `--list`.
- Operator identity via `--actor-user-id/--actor-org-id` or
  `IMPORT_ACTOR_USER_ID`/`IMPORT_ACTOR_ORG_ID`; the org mirror row is
  upserted so the FK is satisfied.
- Prints a human-readable summary; never prints credentials or
  `DATABASE_URL`. Exit 0 success, 1 error, 2 failed commit.

## 4. Tests and results

New tests (all passing):
- `parsers.test.ts` — 12 unit tests (splitting, header/separator/comment
  skipping, leading-zero preservation, derived display, validation errors).
- `importService.unit.test.ts` — 8 unit tests for `enumerateCodeRange`.
- `importService.integration.test.ts` — 8 integration tests against
  `vivr_test`: dry run writes no star_numbers; commit creates star_numbers
  preserving leading zeroes + display derivation; idempotent re-run
  (`created=0`, `alreadyProcessed=true`); invalid-value rejection and
  within-source duplicate rejection both fail the commit without writing
  star_numbers; no-downgrade conflict; category-update gating.
- `auth/index.test.ts` — added 6 tests for `requirePlatformAdmin` /
  `requirePlatformAdminContext` (strict flag checks, org requirement).
- Route tests — import route (9), imports list (3), batch detail (5).

| Command | Result |
| --- | --- |
| `pnpm test` | PASS — 16 files, 118 tests |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm build` | PASS — 3 admin routes registered |
| `pnpm check` | PASS |
| `pnpm db:generate` | PASS — no schema changes |
| CLI dry run (`--mode dry_run --expected-start 0001 --expected-end 2000`) | 1999 accepted, 0 rejected/duplicate/conflict, missing 1 (`1234`); star_numbers untouched |
| `pnpm inventory:import --list` | batches listed with summaries |

## 5. Lifecycle and safety

- **Never downgrade.** A stale source value (`available`) cannot overwrite a
  record already `reserved`/`sold`/`suspended`/`released`/`retired`; the row
  is recorded as a `status_downgrade_protected` conflict and the record is
  left untouched.
- **No status transitions via import.** Any other status difference is a
  conflict; lifecycle moves are reserved for future domain services.
- **Category updates are explicit.** Only with `--allow-category-update` (or
  the API flag), and only while the record is `available`.
- **Idempotency.** `createIfAbsent` (on-conflict-do-nothing) makes COMMIT
  safe to re-run; duplicates in the source are a fatal validation error.
- **Fatal errors refuse the commit.** Any rejected or duplicate row ⇒ batch
  `failed`, zero `star_numbers` writes, full row audit still persisted.
- **Dry runs are pure reads** with respect to inventory.
- **Missing numbers are reported, never synthesized.** `1234` is reported in
  every summary; no row or inventory record is fabricated for it.

## 6. Limitations and next steps

Limitations:
- The import service requires the organization mirror row to exist (Clerk
  session/webhook sync responsibility) because batches reference `actors`,
  which reference `organizations`.
- The CLI is a local operator tool; the platform-admin flag is enforced on
  the API surface, not re-checked in the CLI.
- Missing codes are summary-only (no source line exists); they are not rows.
- Not implemented (out of Phase 4 scope): customer inventory UI,
  reservations, orders, ownership, renewals, pricing, billing, customer
  dashboards, VIVR builder/runtime, LiveKit/SIP/AI routing.

Ties to later phases:
- Phase 5 customer dashboard should read `star_numbers` via the existing
  repository (`list`, `count`, prefix search, category/status filters) with
  tenant context added by ownership/reservation tables.
- The import conflict policy and `source_batch_id` linkage already support
  audit-driven disputes and renewal flows.

---

**READY TO BEGIN PHASE 5 (Customer dashboard)**