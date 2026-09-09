import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";

/**
 * Application organization roles.
 *
 * The tenant boundary is the Better Auth organization. The application's
 * five B2B roles are preserved exactly (no silent renames): Better Auth's
 * organization plugin stores roles as strings, so these keys are used as the
 * role identifiers in the `member.role` column and registered with the
 * plugin via an explicit access-control mapping (`src/lib/auth.ts`).
 *
 * This file is the single source of truth for role keys used by application
 * code. Never hard-code role strings elsewhere.
 */

export const ORGANIZATION_ROLES = [
  "org:admin",
  "org:editor",
  "org:operator",
  "org:analyst",
  "org:member",
] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

/**
 * Roles allowed to administer the active organization (billing, members,
 * organization settings).
 */
export const ORGANIZATION_ADMIN_ROLES: readonly OrganizationRole[] = ["org:admin"];

/**
 * Roles allowed to create, edit, and publish VIVR pages and content.
 */
export const ORGANIZATION_EDITOR_ROLES: readonly OrganizationRole[] = ["org:admin", "org:editor"];

/**
 * Roles allowed to manage calls, routing, destinations, and operational
 * settings.
 */
export const ORGANIZATION_OPERATOR_ROLES: readonly OrganizationRole[] = [
  "org:admin",
  "org:operator",
];

/**
 * Roles allowed to read analytics and reporting data.
 */
export const ORGANIZATION_ANALYST_ROLES: readonly OrganizationRole[] = [
  "org:admin",
  "org:analyst",
  "org:editor",
  "org:operator",
  "org:member",
];

/**
 * Platform-wide roles stored on the Better Auth `user.platform_role` column.
 *
 * - `platform_admin` — platform-wide OSSK administration (inventory imports,
 *   /admin routes). Completely separate from `org:admin`.
 * - `user` — default; no platform-admin access.
 *
 * Promotion is never self-service: it requires the development-only CLI
 * (`pnpm auth:promote-admin --email ...`) in development, or a protected
 * server-side admin process in production.
 */
export const PLATFORM_ROLES = ["user", "platform_admin"] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const PLATFORM_ADMIN_ROLE: PlatformRole = "platform_admin";

/**
 * True when the value is a recognized platform role stored on
 * `user.platform_role`.
 */
export function isPlatformRole(value: unknown): value is PlatformRole {
  return (
    typeof value === "string" &&
    (PLATFORM_ROLES as readonly string[]).includes(value)
  );
}

/**
 * True when a platform role grants platform-administrator access. Only the
 * exact value `"platform_admin"` grants access.
 */
export function grantsPlatformAdmin(value: unknown): boolean {
  return value === PLATFORM_ADMIN_ROLE;
}

export function isOrganizationRole(value: unknown): value is OrganizationRole {
  return (
    typeof value === "string" &&
    (ORGANIZATION_ROLES as readonly string[]).includes(value)
  );
}

/**
 * Access-control statement for the organization plugin. The application
 * keeps Better Auth's default statements (organization/member/invitation
 * resources) and adds VIVR and operations resources so roles carry
 * permission metadata, not just names.
 */
const statements = {
  ...defaultStatements,
  vivr: ["create", "read", "update", "delete", "publish"],
  operations: ["read", "manage"],
  analytics: ["read"],
} as const;

export const organizationAccessControl = createAccessControl(statements);

/**
 * Explicit role → permission mapping for the Better Auth organization
 * plugin. Preserves the documented behavior:
 * - org:admin can manage the organization (default admin permissions +
 *   everything below).
 * - org:editor can create/edit/publish VIVRs.
 * - org:operator manages operational settings.
 * - org:analyst reads analytics.
 * - org:member can read organization data but not edit or publish VIVRs.
 */
export const organizationRoles = {
  "org:admin": organizationAccessControl.newRole({
    organization: ["update", "delete"],
    member: ["create", "update", "delete"],
    invitation: ["create", "cancel"],
    vivr: ["create", "read", "update", "delete", "publish"],
    operations: ["read", "manage"],
    analytics: ["read"],
  }),
  "org:editor": organizationAccessControl.newRole({
    vivr: ["create", "read", "update", "publish"],
    operations: ["read"],
    analytics: ["read"],
  }),
  "org:operator": organizationAccessControl.newRole({
    operations: ["read", "manage"],
    vivr: ["read"],
    analytics: ["read"],
  }),
  "org:analyst": organizationAccessControl.newRole({
    analytics: ["read"],
    vivr: ["read"],
  }),
  "org:member": organizationAccessControl.newRole({
    vivr: ["read"],
  }),
} as const;
