/**
 * Application organization roles.
 *
 * Clerk Organizations are the tenant boundary. Clerk provides `org:admin` and
 * `org:member` by default; `org:editor`, `org:operator`, and `org:analyst` are
 * custom roles that must exist in the Clerk instance (Dashboard → Roles, or
 * `npx clerk@latest` role management) before they can be assigned.
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
 * Clerk user public-metadata key that marks a user as a platform
 * administrator. Platform-admin inventory operations (imports, batch review)
 * are gated on this flag only; organization roles are never sufficient.
 * Set `data.platformAdmin: true` on the operator's Clerk User (Dashboard →
 * Users → Public metadata, or via the Backend API).
 */
export const PLATFORM_ADMIN_METADATA_KEY = "platformAdmin";

/**
 * True when a Clerk User carries the platform-administrator public-metadata
 * flag. Values other than the boolean `true` (absent, `"true"`, `1`) do not
 * grant platform-admin access.
 */
export function isPlatformAdmin(publicMetadata: unknown): boolean {
  return (
    typeof publicMetadata === "object" &&
    publicMetadata !== null &&
    (publicMetadata as Record<string, unknown>)[PLATFORM_ADMIN_METADATA_KEY] ===
      true
  );
}

export function isOrganizationRole(value: unknown): value is OrganizationRole {
  return (
    typeof value === "string" &&
    (ORGANIZATION_ROLES as readonly string[]).includes(value)
  );
}
