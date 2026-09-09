import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./user";

/**
 * Better Auth organization plugin member table (organization membership).
 *
 * Membership is the tenant boundary: a member row is the server-side proof
 * that a user belongs to an organization with a given role. `role` stores the
 * application role keys (`org:admin`, `org:editor`, `org:operator`,
 * `org:analyst`, `org:member`) — Better Auth stores roles as plain strings
 * and supports comma-separated multi-roles.
 */
export const member = pgTable(
  "member",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").notNull(),
    role: text("role").notNull().default("org:member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("member_user_organization_unique").on(table.userId, table.organizationId),
    index("member_organization_idx").on(table.organizationId),
    index("member_user_idx").on(table.userId),
  ],
);

export type MemberRow = typeof member.$inferSelect;
export type NewMemberRow = typeof member.$inferInsert;
