/**
 * Drizzle schema definitions.
 *
 * Phase 03 introduced the PostgreSQL core domain model:
 * - Tenant tables: organizations (app-side tenant mirror) and actors.
 * - Platform catalog: star_numbers (canonical inventory).
 * - Import lifecycle: inventory_import_batches and inventory_import_rows.
 * - Phase 6: vivrs + vivr_versions (one-page VIVR builder).
 *
 * The star-number catalog and import tables are platform-level (not
 * tenant-owned); tenant context is added by future ownership tables.
 */
export * from "./schema/organizations";
export * from "./schema/actors";
export * from "./schema/star-numbers";
export * from "./schema/inventory-imports";
export * from "./schema/vivrs";