# OSSK + VIVR — Phase 5 (Customer Dashboard) Implementation Report

## 1. Summary

Phase 5 delivers the first read-only dashboards on top of the Phase 3/4 data
model:

- A **tenant workspace dashboard** (`/dashboard`) showing the active
  organization (name, slug, role) and read-only platform-inventory counts.
- A **tenant star-number inventory view** (`/dashboard/star-numbers`) listing
  the catalog with server-driven filters and pagination.
- A **platform-admin import review area** `/admin/inventory/imports` (batches)
  and `/admin/inventory/imports/[batchId]` (batch summary + structured rows).
- **Enforcement**: tenant pages derive the organization only from the Clerk
  session; admin pages fail closed unless the user carries the
  `platformAdmin` public-metadata flag.

All data flows through repositories via dedicated server loaders — no Drizzle
access from React components, no new tables, no new migrations, no new API
routes, and the import/lifecycle rules were not extended. Everything is
read-only; there is no reservation, order, ownership, renewal, pricing,
billing, or VIVR functionality in this phase.

## 2. Tenant dashboard

**Route group:** `(dashboard)` (existing `auth.protect()` layout).

**Loaders** — `src/server/dashboard/tenant.ts`:
- `getTenantContext()` wraps `requireOrganizationRole([...TENANT_VIEWER_ROLES])`
  (all recognized roles today) and returns `null` when the signed-in user has
  no active organization, so the UI can show a "select an organization" empty
  state instead of an error wall. Authentication and role errors still
  propagate.
- `getDashboardOverview()` — org profile (`findById`) plus per-category
  inventory counts (`count({ category })`) for the `/dashboard` page.
- `getStarNumberListing(...)` — validates filters (prefix `q` truncated to 12
  chars, canonical `category`/`status`; invalid values are ignored), resolves
  pagination (`page`, 25/page), and reads via
  `StarNumbersRepository.list()` + `.count()`. Pages are characterized as
  **"Platform inventory"** and the copy explicitly notes that tenant ownership
  arrives in a later phase — nothing implies a customer owns a number yet.

**Pages:**
- `/dashboard` — organization header + count cards (total + silver/gold/
  platinum/diamond) + link to the inventory listing. Uses
  `getDashboardOverview()`.
- `/dashboard/star-numbers` — table of
  `display_number | category | status` with a native `<form method="get">`
  filter bar (prefix, category, status) and prev/next pagination links that
  preserve the query string; no debounced client state. Uses
  `getStarNumberListing()`.

The empty state (`OrganizationEmptyState`) renders for authenticated users
without an active organization on both pages.

## 3. Platform-admin dashboard

**Route group:** `(admin)` — its pages live under `(admin)/admin/...` so the
public URL is `/admin/inventory/imports` (route groups do not contribute a
path segment).

**Loaders** — `src/server/dashboard/admin.ts`:
- `getImportBatches()` — `InventoryImportsRepository.listBatches(50)` with
  Zod-parsed `summaryJson` (zeroed fallback for malformed stored JSON).
- `getImportBatch(batchId)` — `findBatchById` (→ `notFound()` when absent) +
  `findRowsByBatch`, deriving structured row views from the stored JSON:
  `number` (display form when derivable, else the raw first cell), category/
  status (from normalized JSON, falling back to raw cells), `result`, and the
  error message. **Raw `rawValueJson`/`normalizedValueJson` blobs are never
  rendered.**

**Views** — `src/components/dashboard/batch-list.tsx` and `batch-detail.tsx`:
- Batches: source (linked), mode, status, accepted/rejected/conflict counts,
  started time, plus aggregate chips (total rows, created, updated,
  duplicates, missing).
- Batch detail: header (source, mode, status, started/completed), a summary
  stat grid, and the per-row outcome table (line, star number, category,
  status, result, error with full text in the `title` attribute and truncated
  visible text).

An `AdminShell` provides admin navigation (import batches, back to dashboard),
an `error.tsx` explains that platform-admin access is required, `loading.tsx`
renders skeletons, and `not-found.tsx` covers missing batches.

## 4. RBAC and tenancy

- **Tenant routes** (`/dashboard`, `/dashboard/star-numbers`):
  - Layout: `auth.protect()` redirects signed-out users to sign-in.
  - Data: `requireOrganizationRole` resolves the organization + role strictly
    from the Clerk session. The browser never supplies an organization id; the
    catalog query carries no tenant identifier because Phase 3 `star_numbers`
    has no ownership columns yet (platform-level inventory).
  - A signed-in but org-less user gets the friendly "select an organization"
    state rather than an error.
- **Admin routes** (`/admin/inventory/imports`, `.../[batchId]`):
  - Layout: `auth.protect()` (redirect signed-out) + `requirePlatformAdmin()`
    (fail closed for signed-in non-admins via the `(admin)` error boundary).
  - Loaders: `requirePlatformAdminContext()` is invoked before any DB access,
    so non-admins are rejected without touching the database.
- **Navigation**: the dashboard shell shows the "Platform admin" link only
  when `isCurrentUserPlatformAdmin()` (non-throwing, public-metadata read)
  returns true; the helper is used purely for rendering, never authorization.
- **Org isolation** is demonstrated by tests: the tenant context is derived
  from the mocked session (different sessions → different org ids/slugs) and
  the loaders never read organization input from callers.

## 5. Repositories usage

No direct Drizzle usage from any React component. Dashboard loaders open a
`createDatabase()` connection and use:

| Loader | Repository call |
| --- | --- |
| `getDashboardOverview` | `OrganizationRepository.findById(orgId)`; `StarNumbersRepository.count({ category })` × 4 |
| `getStarNumberListing` | `StarNumbersRepository.list({ search, category, status, limit, offset })`; `.count({ ... })` |
| `getImportBatches` | `InventoryImportsRepository.listBatches(50)` |
| `getImportBatch` | `InventoryImportsRepository.findBatchById(id)`; `.findRowsByBatch(id)` |

Every loader closes its connection in a `finally`. New helpers: non-throwing
`isCurrentUserPlatformAdmin()` in `src/server/auth/index.ts` (auth surface,
not a repository).

## 6. Tests and commands

Tests added (all unit/service; the existing integration suites are untouched
except the auth count):

- `src/server/auth/index.test.ts` — `isCurrentUserPlatformAdmin` (±4).
- `src/server/dashboard/tenant.test.ts` (+12) — org context resolution, missing
  org → null, auth/role propagation, filter validation, page clamping, count
  aggregation, client lifecycle, session-derived tenancy.
- `src/server/dashboard/admin.test.ts` (+6) — admin context required before DB,
  batch listing + summary parsing (incl. malformed JSON fallback), structured
  row derivation, `notFound` on missing batch, RBAC rejection.
- `src/components/dashboard/overview.test.tsx`, `star-numbers-table.test.tsx`,
  `batch-list.test.tsx`, `batch-detail.test.tsx` (+20) — rendering via
  `renderToStaticMarkup` (no new test dependencies); covers empty states,
  filter preservation in pagination links, aggregate chips, structured row
  rendering with no raw JSON leakage.

| Command | Result |
| --- | --- |
| `pnpm test` | PASS — 22 files, 160 tests |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm build` | PASS — routes: `/dashboard`, `/dashboard/star-numbers`, `/admin/inventory/imports`, `/admin/inventory/imports/[batchId]` |
| `pnpm check` | PASS (lint + typecheck + test + build) |
| `pnpm db:generate` | PASS — no schema changes, nothing to migrate |

No secrets are logged anywhere in the new code; loaders parse stored summary/
row JSON defensively and render only structured fields.

## 7. Limitations and next steps

Limitations:
- Tenant inventory is explicitly platform inventory: `star_numbers` has no
  ownership columns, so the dashboard cannot yet scope rows to a tenant. The
  tenant identity lives only in the session context.
- The dev database holds no committed `star_numbers` rows (Phase 4 ran a
  dry-run only) and one dry-run batch, so tenant tables currently render empty
  states and the admin batch list shows that single batch until an operator
  commits the import.
- Admin views are read-only: import execution remains on the CLI/API.
- Pagination for the admin batch list is capped at the 50 most recent batches
  (no pager yet).

Ties to later phases:
- Phase 6 (one-page VIVR builder) will introduce the customer inventory view;
  ownership/reservation tables will make `/dashboard/star-numbers` truly
  tenant-scoped, and the filter scaffolding (prefix/category/status, pager)
  carries over directly.
- The structured batch detail view already renders the audit data needed for
  dispute and renewal flows in later phases.

---

**READY TO BEGIN PHASE 6 (One-page VIVR builder)**