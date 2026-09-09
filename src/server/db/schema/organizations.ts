import { jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Canonical organization (tenant) table.
 *
 * Strategy: Better Auth's organization plugin is the canonical application
 * organization system. This table — introduced in Phase 3 as the app-side
 * Clerk org mirror — is reused as the Better Auth `organization` table by
 * mapping the plugin's model to plural table names (`usePlural: true`).
 * `id` remains a text PK (Better Auth generates IDs client-side of the DB);
 * `name`/`slug` keep their Phase 3 semantics; `logo`/`metadata` are the
 * plugin's additional fields. Both databases were empty at migration time,
 * so no organization data migration was required (verified before applying).
 *
 * Tenant-owned tables (`vivrs`, `actors`, ...) reference `organizations.id`
 * via `organization_id`; the boundary continues to be enforced by
 * server-side membership checks.
 */
export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    logo: text("logo"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("organizations_slug_unique").on(table.slug),
  ],
);

export type OrganizationRow = typeof organizations.$inferSelect;
export type NewOrganizationRow = typeof organizations.$inferInsert;
