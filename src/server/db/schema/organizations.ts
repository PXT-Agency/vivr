import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Application-side mirror of Clerk organization (tenant) metadata.
 *
 * `id` is the Clerk organization ID (external tenant identifier), never
 * generated here. The organizations table is the tenant root: tenant-owned
 * tables reference `organizations.id` via `organization_id`.
 *
 * Only data that PostgreSQL must own is stored here; the remainder of Clerk
 * identity lives in Clerk.
 */
export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("organizations_slug_unique").on(table.slug),
  ],
);

export type OrganizationRow = typeof organizations.$inferSelect;
export type NewOrganizationRow = typeof organizations.$inferInsert;