# OSSK Platform — OpenCode AI Kickoff

## Mission

Build the first production-quality vertical slice of OSSK: a Kenyan star-number inventory and customer-facing catalog that will later connect to VIVR pages, voice agents, routing, billing, and administration.

Do not attempt to implement the full OSSK + VIVR + LiveKit platform in the first task. Work in small, reviewable vertical slices and stop after each slice.

## Source documents

The repository contains the following product and architecture documents:

- `00_MASTER_AGENT_INSTRUCTIONS.md`
- `01_FOUNDATION_NEXTJS.md`
- `02_CLERK_MULTI_TENANCY.md`
- `03_POSTGRES_CORE_MODEL.md`
- `04_VIVR_BUILDER.md`
- `05_PUBLIC_VIVR_RUNTIME.md`
- `06_LIVEKIT_AI_VOICE.md`
- `07_AI_SMART_ROUTING.md`
- `08_SIP_TELEPHONY_PROVIDER.md`
- `09_STORAGE_REALTIME_CRON_ANALYTICS.md`
- `10_BILLING_ADMIN_EXISTING_OSSK.md`
- `11_TESTING_DEPLOYMENT_SECURITY.md`
- `12_EXECUTION_ROADMAP.md`
- `star-inventory-part-01-2.md`
- `star-inventory-part-02.csv`

Read only the documents relevant to the current task. Do not rewrite or reinterpret the whole architecture without an explicit decision record.

## Initial product boundary

The first development milestone is inventory foundation, not the complete marketplace.

### In scope

- Next.js App Router + TypeScript foundation.
- Clerk authentication and organization context.
- PostgreSQL with Drizzle ORM.
- Tenant-safe server helpers.
- Platform-admin inventory access.
- Star-number inventory import and validation.
- Search, filtering, sorting, pagination, and detail view.
- Categories: Silver, Gold, Platinum, Diamond.
- Initial status: Available.
- Append-only inventory audit events.
- Automated tests and seed/import verification.

### Out of scope for the first milestone

- LiveKit voice agents.
- SIP/PSTN provisioning.
- AI classification or routing.
- Customer self-service purchasing.
- Payment automation.
- Renewals and ownership expiry.
- Full VIVR builder.
- Realtime dashboards.
- Generic workflow engine.

## Non-negotiable rules

1. Never trust `organization_id`, user IDs, role claims, or inventory IDs submitted by the browser.
2. Resolve authenticated identity and organization context server-side.
3. Platform-admin inventory operations must be separate from customer organization roles.
4. Preserve the leading `*` in the public display format, for example `*0001`.
5. Store the numeric portion in a separate canonical field with leading zeroes preserved as text, for example `0001`.
6. Never store star numbers as integers.
7. Do not infer prices from category names.
8. Do not infer ownership or reservation from `Available` status.
9. Validate every import row before insertion.
10. Make imports idempotent and safe to retry.
11. Do not silently repair malformed or missing numbers.
12. Do not claim a task is complete until typecheck, lint, tests, and build have been run.

## Required agent workflow

Before editing:

1. Inspect the repository and existing package versions.
2. Read the relevant source documents.
3. State the exact task boundary, affected files, tables, routes, and tests.
4. Identify ambiguities and stop if a decision is required.
5. Add or update an ADR for any architectural decision.

After editing:

1. Run formatting only on changed files.
2. Run lint.
3. Run typecheck.
4. Run targeted tests.
5. Run the production build.
6. Report migrations, environment variables, files changed, test results, and known limitations.
7. Update `docs/PROGRESS.md`.

## First task

Implement only the foundation and star-number inventory read path. Do not begin reservations, orders, billing, VIVR, or voice features until the inventory acceptance criteria pass.

## First-task acceptance criteria

- The app starts locally from documented commands.
- `/api/health` returns `{ "ok": true }`.
- Database migrations run successfully.
- The inventory schema is created.
- The supplied inventory source files can be validated and imported.
- Duplicate imports do not create duplicate inventory records.
- `*1234` is detected as absent from the supplied sample inventory and is reported for review rather than invented.
- Inventory search preserves leading zeroes and the leading `*` in display output.
- Only authorized platform administrators can access inventory administration routes.
- Tests prove an organization user cannot access platform-admin inventory operations.
- Tests cover invalid category, invalid status, malformed number, duplicate number, and missing number cases.

## Stop conditions

Stop and report instead of guessing if any of the following is unclear:

- Whether platform-admin identity should be managed by Clerk metadata or a database table.
- Which exact database deployment is being used.
- Whether the provided inventory is authoritative or sample data.
- The pricing for each category.
- The legal or regulatory status of the star-number ranges.
- The production telephony provider.

## Completion report format

```text
Task completed:
User-visible behavior:
Files changed:
Database migrations:
Environment variables:
Tests run:
Build/lint/typecheck results:
Manual QA steps:
Known limitations:
Follow-up blockers:
```
