import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./user";

/**
 * Better Auth organization plugin invitation table.
 *
 * Invitations can be created (org admins invite by email) but no email
 * provider is configured in this phase, so delivery is a documented
 * limitation: `sendInvitationEmail` is not provided and invitation emails
 * are NOT sent.
 */
export const invitation = pgTable(
  "invitation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    email: text("email").notNull(),
    role: text("role").notNull(),
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("invitation_organization_idx").on(table.organizationId),
    index("invitation_email_idx").on(table.email),
  ],
);

export type InvitationRow = typeof invitation.$inferSelect;
export type NewInvitationRow = typeof invitation.$inferInsert;
