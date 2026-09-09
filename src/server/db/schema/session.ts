import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./user";

/**
 * Better Auth session table. `token` is the hashed session token (the raw
 * token only ever lives in the signed cookie). `activeOrganizationId` is the
 * organization plugin's server-side active-organization pointer, resolved
 * exclusively from the validated session.
 */
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  activeOrganizationId: text("active_organization_id"),
});

export type SessionRow = typeof session.$inferSelect;
export type NewSessionRow = typeof session.$inferInsert;
