import { relations } from "drizzle-orm";

import { invitation } from "./invitation";
import { member } from "./member";
import { organizations } from "./organizations";
import { user } from "./user";

/**
 * Drizzle relational-query definitions for Better Auth tables.
 *
 * The org plugin's `listOrganizations` and `setActiveOrganization` use
 * `findMany({ join: { organization: true } })`, which requires `db.query`
 * to expose relational helpers. With `usePlural: false` the adapter resolves
 * join relation keys as `${joinModel}s`; the property names here must match.
 *
 * Relation names on member/invitation: `organizations`, `users` (plural).
 * These are purely query-time definitions — no SQL objects are created.
 */

export const memberRelations = relations(member, ({ one }) => ({
  organizations: one(organizations, {
    fields: [member.organizationId],
    references: [organizations.id],
  }),
  users: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
  organizations: one(organizations, {
    fields: [invitation.organizationId],
    references: [organizations.id],
  }),
  users: one(user, {
    fields: [invitation.inviterId],
    references: [user.id],
  }),
}));
