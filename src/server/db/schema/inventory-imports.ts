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

import {
  IMPORT_BATCH_MODES,
  IMPORT_BATCH_STATUSES,
  IMPORT_ROW_RESULTS,
} from "@/config/starNumbers";
import type { JsonValue } from "@/types";
import { actors } from "./actors";

/**
 * Import batch for star-number inventory ingestion.
 *
 * Batch-level metadata per docs/02_STAR_INVENTORY_IMPORT.md. Batches are
 * platform operations (not tenant-owned); they are run by an application
 * actor. `source_hash` is a cryptographic hash of the source content so a
 * repeated source can be reported as already processed; it is not unique
 * because dry runs and commits of the same source are distinct batches.
 */
export const inventoryImportBatches = pgTable(
  "inventory_import_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceName: text("source_name").notNull(),
    sourceHash: text("source_hash").notNull(),
    mode: text("mode").notNull(),
    status: text("status").notNull(),
    summaryJson: jsonb("summary_json").$type<JsonValue>().notNull().default(sql`'{}'::jsonb`),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => actors.id),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("import_batches_source_hash_idx").on(table.sourceHash),
    index("import_batches_mode_idx").on(table.mode),
    index("import_batches_status_idx").on(table.status),
    index("import_batches_actor_idx").on(table.actorId),
    check(
      "import_batches_mode_check",
      sql`${table.mode} IN (${sql.raw(IMPORT_BATCH_MODES.map((mode) => `'${mode}'`).join(", "))})`,
    ),
    check(
      "import_batches_status_check",
      sql`${table.status} IN (${sql.raw(IMPORT_BATCH_STATUSES.map((status) => `'${status}'`).join(", "))})`,
    ),
  ],
);

export type InventoryImportBatchRow = typeof inventoryImportBatches.$inferSelect;
export type NewInventoryImportBatchRow = typeof inventoryImportBatches.$inferInsert;

/**
 * Row-level import outcome for one source line. Stores the raw source value
 * and the normalized values so failures are auditable without re-parsing.
 * `result` is one of the canonical import row results
 * (accepted, rejected, duplicate, missing, conflict).
 */
export const inventoryImportRows = pgTable(
  "inventory_import_rows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => inventoryImportBatches.id),
    lineNumber: integer("line_number").notNull(),
    rawValueJson: jsonb("raw_value_json").$type<JsonValue>().notNull(),
    normalizedValueJson: jsonb("normalized_value_json").$type<JsonValue>(),
    result: text("result").notNull(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("import_rows_batch_line_unique").on(table.batchId, table.lineNumber),
    index("import_rows_batch_idx").on(table.batchId),
    index("import_rows_result_idx").on(table.result),
    check(
      "import_rows_result_check",
      sql`${table.result} IN (${sql.raw(IMPORT_ROW_RESULTS.map((result) => `'${result}'`).join(", "))})`,
    ),
  ],
);

export type InventoryImportRowRow = typeof inventoryImportRows.$inferSelect;
export type NewInventoryImportRowRow = typeof inventoryImportRows.$inferInsert;