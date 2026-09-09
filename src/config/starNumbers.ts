/**
 * Canonical star-number, category, status, and import lifecycle values.
 *
 * This module is the single source of truth for the machine values used by
 * the database schema (check constraints), application validation, and tests.
 * Values follow docs/01_STAR_NUMBER_DOMAIN.md and
 * docs/02_STAR_INVENTORY_IMPORT.md. Do not hard-code these strings elsewhere.
 */

/** Initial inventory format: four-digit codes `0001` through `2000`. */
export const STAR_NUMBER_FORMAT_VERSION = 1;

/** Canonical four-digit star-number code pattern. */
export const STAR_NUMBER_CODE_PATTERN = /^[0-9]{4}$/;

/** Canonical star-number categories (machine values). */
export const STAR_NUMBER_CATEGORIES = [
  "silver",
  "gold",
  "platinum",
  "diamond",
] as const;

export type StarNumberCategory = (typeof STAR_NUMBER_CATEGORIES)[number];

/** Canonical star-number lifecycle statuses (machine values). */
export const STAR_NUMBER_STATUSES = [
  "available",
  "reserved",
  "sold",
  "suspended",
  "released",
  "retired",
] as const;

export type StarNumberStatus = (typeof STAR_NUMBER_STATUSES)[number];

/**
 * The status imported star-number rows start with (`available`).
 * docs/01_STAR_NUMBER_DOMAIN.md: "The imported sample starts with available."
 */
export const STAR_NUMBER_STATUS_AVAILABLE: StarNumberStatus = "available";

/** Default format version for new inventory records. */
export const STAR_NUMBER_DEFAULT_FORMAT_VERSION = STAR_NUMBER_FORMAT_VERSION;

export function isStarNumberCategory(value: unknown): value is StarNumberCategory {
  return (
    typeof value === "string" &&
    (STAR_NUMBER_CATEGORIES as readonly string[]).includes(value)
  );
}

export function isStarNumberStatus(value: unknown): value is StarNumberStatus {
  return (
    typeof value === "string" &&
    (STAR_NUMBER_STATUSES as readonly string[]).includes(value)
  );
}

/** Import batch modes. */
export const IMPORT_BATCH_MODES = ["dry_run", "commit"] as const;

export type ImportBatchMode = (typeof IMPORT_BATCH_MODES)[number];

/** Import batch lifecycle statuses. */
export const IMPORT_BATCH_STATUSES = [
  "started",
  "completed",
  "failed",
] as const;

export type ImportBatchStatus = (typeof IMPORT_BATCH_STATUSES)[number];

/** Row-level import result values. */
export const IMPORT_ROW_RESULTS = [
  "accepted",
  "rejected",
  "duplicate",
  "missing",
  "conflict",
] as const;

export type ImportRowResult = (typeof IMPORT_ROW_RESULTS)[number];

export function isImportBatchMode(value: unknown): value is ImportBatchMode {
  return (
    typeof value === "string" &&
    (IMPORT_BATCH_MODES as readonly string[]).includes(value)
  );
}

export function isImportBatchStatus(value: unknown): value is ImportBatchStatus {
  return (
    typeof value === "string" &&
    (IMPORT_BATCH_STATUSES as readonly string[]).includes(value)
  );
}

export function isImportRowResult(value: unknown): value is ImportRowResult {
  return (
    typeof value === "string" &&
    (IMPORT_ROW_RESULTS as readonly string[]).includes(value)
  );
}