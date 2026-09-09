import { sql } from "drizzle-orm";
import { boolean, check, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Better Auth user table (authentication source of truth, self-hosted in
 * PostgreSQL). Replaces Clerk users. `platformRole` is the database-backed
 * platform-administrator flag ("user" | "platform_admin") that replaces the
 * Clerk `publicMetadata.platformAdmin` flag.
 *
 * Field names follow the Better Auth CLI-generated Drizzle schema
 * (snake_case columns, singular model names) so `drizzleAdapter` with
 * `usePlural: false` maps without field overrides.
 */
export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    /**
     * Platform-wide role. "platform_admin" grants access to platform
     * administration (inventory imports, admin routes); "user" is the
     * default. This is separate from organization roles (org:*).
     */
    platformRole: text("platform_role").notNull().default("user"),
  },
  (table) => [
    uniqueIndex("user_email_unique").on(table.email),
    check("user_platform_role_check", sql`${table.platformRole} IN ('user', 'platform_admin')`),
  ],
);

export type UserRow = typeof user.$inferSelect;
export type NewUserRow = typeof user.$inferInsert;
