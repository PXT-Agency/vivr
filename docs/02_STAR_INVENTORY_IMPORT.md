# Star-Number Inventory Import Contract

## Purpose

Import the supplied star-number sample into PostgreSQL safely and repeatably. The source files are sample inventory, not proof of regulatory availability or production ownership.

## Source files

Expected source files:

- `star-inventory-part-01-2.md`: sample records from `0001` through `0999`.
- `star-inventory-part-02.csv`: sample records beginning at `1000` and ending at `2000`.

The files use the logical columns:

```text
STAR NUMBER, STATUS, CATEGORY
```

The source formatting is not guaranteed to be clean CSV or clean Markdown in every row. The importer must parse the supported formats explicitly and reject malformed rows rather than silently skipping them.

## Important data observation

The supplied sample appears to omit `1234`: it contains `1233` and then `1235`. Treat this as a source-data gap. Do not create `*1234` automatically. The import report must identify it as missing if the expected range is configured as `0001` through `2000`.

## Import modes

Implement two modes:

### Dry run

- Parse all source rows.
- Normalize whitespace.
- Validate every field.
- Detect duplicates.
- Detect missing expected codes if a complete expected range is supplied.
- Report accepted, rejected, duplicate, and missing counts.
- Make no database changes.

### Commit

- Run the same validations as dry run.
- Refuse to commit if fatal validation errors exist.
- Insert new valid rows.
- Update explicitly allowed mutable fields only when an import policy permits it.
- Never downgrade a lifecycle status from a more advanced state because a stale source file says `Available`.
- Use an import batch ID.
- Store row-level errors.
- Be safe to retry.

## Normalization rules

For each source row:

1. Trim whitespace.
2. Remove Markdown table pipes when present.
3. Remove a leading `*` from the source number to derive `number_code`.
4. Preserve leading zeroes by treating the result as text.
5. Validate exactly four digits for the initial dataset.
6. Reconstruct canonical `display_number` as `*` plus `number_code`.
7. Normalize status to lowercase machine values.
8. Normalize category to lowercase machine values.
9. Reject unexpected values.
10. Preserve the original source text in the import error or raw-row audit record when a row fails.

## Import tables

Recommended supporting tables:

```text
inventory_import_batches
- id
- source_name
- source_hash
- mode
- status
- started_at
- completed_at
- actor_id
- summary_json

inventory_import_rows
- id
- batch_id
- line_number
- raw_value_json
- normalized_value_json
- result
- error_code
- error_message
- created_at
```

The import batch should include a cryptographic hash of the source content. A repeated source hash may be reported as already processed, but the command must still be safe to rerun.

## Conflict policy

Use these rules:

- Same `number_code`, same category, same status: no-op.
- Same `number_code`, changed category while status is `available`: allow only through an explicit import update flag and audit the change.
- Same `number_code`, source says `available`, database says `reserved`, `sold`, `suspended`, `released`, or `retired`: do not downgrade; create a conflict record.
- Duplicate `number_code` within one source: fatal row error.
- Duplicate `display_number` after normalization: fatal row error.
- Invalid category or status: row error.
- Missing number code: row error.
- Unexpected number length: row error unless an approved format version is selected.

## Expected-range validation

The importer may receive an expected range, initially:

```text
start: 0001
end:   2000
```

Missing numbers in that range must be reported separately from malformed rows. Missing does not mean unavailable, sold, or retired. It means the source sample did not contain a record.

For the supplied sample, verify and report the apparent gap at `1234`.

## CLI contract

Implement a command with a contract similar to:

```text
pnpm inventory:import --dry-run \
  --source ./data/star-inventory \
  --expected-start 0001 \
  --expected-end 2000

pnpm inventory:import --commit \
  --source ./data/star-inventory \
  --expected-start 0001 \
  --expected-end 2000
```

The exact command name may follow the repository convention, but the behavior must remain equivalent.

## Acceptance tests

- A valid `*0001` row imports as `number_code = "0001"`.
- A valid `0001` row imports as `display_number = "*0001"`.
- Leading zeroes survive database round trips.
- Re-running the same import is idempotent.
- Duplicate source rows are reported.
- Invalid categories are rejected.
- Invalid statuses are rejected.
- Malformed number codes are rejected.
- `1234` is reported as missing from the supplied expected range if absent.
- Existing `sold` or `reserved` records are never downgraded by a stale available import.
- Dry run performs no database mutation.
- Commit produces an import batch and row-level results.
- Organization users cannot execute platform inventory imports.
