import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { STAR_NUMBER_CATEGORIES, STAR_NUMBER_STATUSES } from "@/config/starNumbers";
import type { JsonValue } from "@/types";
import { inventoryImportBatches } from "./inventory-imports";

/**
 * Canonical star-number inventory records.
 *
 * Follows docs/01_STAR_NUMBER_DOMAIN.md:
 * - `number_code` is TEXT with significant leading zeroes (e.g. `0001`).
 * - `display_number` is the derived public form `*` + `number_code` and must
 *   not be editable independently; a check constraint enforces the derivation.
 * - `format_version` starts at 1.
 * - `category` and `status` are constrained to canonical machine values.
 * - Records are never physically deleted as part of lifecycle operations.
 * - `source_batch_id` links back to the import batch that ingested the record.
 *
 * The star-number catalog is a platform-level table, NOT tenant-owned: every
 * `number_code`/`display_number` is globally unique across the platform.
 * Tenant context is added by future ownership/reservation tables, not here.
 */
export const starNumbers = pgTable(
  "star_numbers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    numberCode: text("number_code").notNull(),
    displayNumber: text("display_number").notNull(),
    formatVersion: integer("format_version").notNull().default(1),
    category: text("category").notNull(),
    status: text("status").notNull(),
    memorabilityScore: integer("memorability_score"),
    patternTags: jsonb("pattern_tags").$type<JsonValue[]>().notNull().default(sql`'[]'::jsonb`),
    sourceBatchId: uuid("source_batch_id").references(() => inventoryImportBatches.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("star_numbers_number_code_unique").on(table.numberCode),
    uniqueIndex("star_numbers_display_number_unique").on(table.displayNumber),
    index("star_numbers_category_idx").on(table.category),
    index("star_numbers_status_idx").on(table.status),
    index("star_numbers_category_status_idx").on(table.category, table.status),
    index("star_numbers_source_batch_idx").on(table.sourceBatchId),
    check(
      "star_numbers_display_number_check",
      sql`${table.displayNumber} = ('*' || ${table.numberCode})`,
    ),
    check("star_numbers_format_version_check", sql`${table.formatVersion} >= 1`),
    check(
      "star_numbers_category_check",
      sql`${table.category} IN (${sql.raw(STAR_NUMBER_CATEGORIES.map((category) => `'${category}'`).join(", "))})`,
    ),
    check(
      "star_numbers_status_check",
      sql`${table.status} IN (${sql.raw(STAR_NUMBER_STATUSES.map((status) => `'${status}'`).join(", "))})`,
    ),
  ],
);

export type StarNumberRow = typeof starNumbers.$inferSelect;
export type NewStarNumberRow = typeof starNumbers.$inferInsert;