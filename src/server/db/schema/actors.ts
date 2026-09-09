import { pgTable, text, timestamp, uuid, uniqueIndex, index } from "drizzle-orm/pg-core";

import { organizations } from "./organizations";

/**
 * Application-level actors: a user acting within an organization context.
 *
 * `user_id` is the Clerk user ID; `organization_id` is the Clerk organization
 * ID (tenant boundary). A user is a distinct actor for each organization they
 * belong to. Used by audit-oriented tables (import batches) to record who
 * performed an operation. Clerk remains the source of truth for identity; this
 * table only stores the surface needed for the tenant-scoped application
 * record.
 */
export const actors = pgTable(
  "actors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("actors_user_organization_unique").on(table.userId, table.organizationId),
    index("actors_organization_idx").on(table.organizationId),
    index("actors_user_idx").on(table.userId),
  ],
);

export type ActorRow = typeof actors.$inferSelect;
export type NewActorRow = typeof actors.$inferInsert;