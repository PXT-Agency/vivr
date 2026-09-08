# OSSK Star-Number Domain Specification

## Purpose

This document defines the canonical domain model for Kenyan star-number inventory. It is the implementation contract for database schema, validation, import, search, admin screens, and future reservation and ownership workflows.

## Terminology

- **Star number:** A special number represented publicly with a leading `*`, such as `*0001`.
- **Number code:** The numeric portion without the leading `*`, stored as text with fixed width, such as `0001`.
- **Display number:** The canonical public form, consisting of `*` plus the number code, such as `*0001`.
- **Inventory record:** A database row representing one known star-number code.
- **Category:** Commercial or merchandising tier assigned to an inventory record.
- **Status:** Lifecycle state of the inventory record.
- **Reservation:** A temporary hold on an available inventory record. This is a later feature and must not be simulated by changing inventory status without a reservation record.
- **Ownership:** A completed assignment of a number to an organization or customer. This is a later feature.

## Canonical format

The initial sample uses four-digit codes ranging from `0001` through `2000`.

Validation rules:

- `number_code` must match `^[0-9]{4}$` for the initial four-digit inventory.
- `display_number` must equal `*${number_code}`.
- The leading zeroes are significant.
- The leading `*` is required in public display and search output.
- Do not coerce number codes to JavaScript or SQL integers.
- Future number lengths must be introduced through an explicit format-version decision, not by silently relaxing the current validator.

Recommended columns:

```text
id                  uuid primary key
number_code         varchar(32) not null
 display_number     varchar(33) not null
format_version      integer not null default 1
category            enum/text not null
status              enum/text not null
memorability_score  integer nullable
pattern_tags        jsonb not null default []
source_batch_id     uuid nullable
created_at          timestamp with time zone not null
updated_at          timestamp with time zone not null
```

Remove the accidental leading space before `display_number` when implementing the actual schema.

## Categories

The supplied sample contains these categories:

- `Silver`
- `Gold`
- `Platinum`
- `Diamond`

Recommended machine values:

```text
silver
 gold
platinum
diamond
```

Remove the accidental leading space before `gold` when implementing the actual enum or constant list.

Category is descriptive metadata. It must not automatically determine price, tax, reservation fee, or renewal fee. Pricing belongs in a separate versioned pricing model.

## Statuses

The supplied sample uses:

- `Available`

Recommended future lifecycle values:

```text
available
reserved
sold
suspended
released
retired
```

Rules:

- The imported sample starts with `available`.
- `reserved` requires an active reservation record.
- `sold` requires an ownership or completed order record.
- `released` must retain historical lifecycle information.
- `retired` must not be returned in public availability search.
- Status transitions must be performed by domain services, not arbitrary admin form updates.
- Every transition must create an append-only audit event.

## Uniqueness and constraints

- `number_code` must be globally unique.
- `display_number` must be globally unique.
- `display_number` must be derived from `number_code` and must not be independently editable.
- Category and status must be validated against canonical machine values.
- Inventory records must not be deleted as part of ordinary lifecycle operations.
- Unknown or malformed source rows must be rejected or quarantined with an import error.

## Future relationships

The inventory record may later connect to:

```text
star_numbers
  -> reservations
  -> order_items
  -> ownerships
  -> renewal_plans
  -> phone_numbers
  -> vivrs
  -> voice_agents
```

Do not add nullable foreign keys for all future capabilities in the first migration unless they are required by the current slice. Add relationships through later migrations with explicit invariants.

## Search requirements

The initial inventory search must support:

- Exact display-number search, such as `*0001`.
- Exact code search, such as `0001`.
- Prefix search, such as `*00` or `00`.
- Category filter.
- Status filter.
- Sort by number code.
- Pagination.
- Empty-result handling.

Search must not strip leading zeroes or convert the query to a numeric value.

## Memorability fields

The existing product direction includes memorability scoring and pattern tags. These fields should be introduced as derived, explainable metadata rather than opaque AI output.

Initial implementation may store them as nullable fields and leave scoring disabled until a separate specification defines:

- Repeated digits.
- Sequential digits.
- Mirror or palindrome patterns.
- Round numbers.
- Blocks or grouped repetition.
- Category assignment rules.
- Score range and explanation.

Do not change category automatically from memorability score without an approved business rule.
