/**
 * Drizzle schema definitions.
 *
 * Phase 03 introduced the PostgreSQL core domain model:
 * - Tenant tables: organizations (canonical tenant root) and actors.
 * - Platform catalog: star_numbers (canonical inventory).
 * - Import lifecycle: inventory_import_batches and inventory_import_rows.
 * - Phase 6: vivrs + vivr_versions (one-page VIVR builder).
 *
 * Auth migration: Better Auth tables (user, session, account, verification)
 * and the organization plugin tables (member, invitation) are defined here.
 * The `organizations` table is the canonical Better Auth organization table
 * (mapped via `usePlural`); tenant-owned tables continue to reference it.
 *
 * The star-number catalog and import tables are platform-level (not
 * tenant-owned); tenant context is added by future ownership tables.
 */
export * from "./schema/organizations";
export * from "./schema/actors";
export * from "./schema/star-numbers";
export * from "./schema/inventory-imports";
export * from "./schema/vivrs";
export * from "./schema/user";
export * from "./schema/session";
export * from "./schema/account";
export * from "./schema/verification";
export * from "./schema/member";
export * from "./schema/invitation";