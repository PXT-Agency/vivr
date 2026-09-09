import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  VIVR_DEFAULT_BRAND_COLOR,
  VIVR_STATUSES,
  VIVR_THEME_MODES,
} from "@/config/vivr";
import type { VivrConfig } from "@/types/vivr";
import { actors } from "./actors";
import { organizations } from "./organizations";

/**
 * One-page VIVR (tenant-owned) and its version history.
 *
 * Design (docs/03 "VIVR data model" + "Publish model", applied to docs/04):
 * - A VIVR is a single page of ordered blocks. Searchable/normalized fields
 *   (slug, title, description, status, branding) live in columns; the flexible
 *   block configuration lives in a JSONB snapshot on `vivr_versions`.
 * - Editing changes a draft; publishing creates a new immutable version
 *   (`published_at` set). A VIVR always has exactly one mutable draft version
 *   (partial unique index on `vivr_versions` where `published_at IS NULL`).
 * - "Only one version published at a time" is represented by the pointer
 *   `vivrs.current_published_version_id`. Historical published versions keep
 *   their immutable `published_at` timestamp; rollback only moves the pointer,
 *   never mutating version rows (docs/04 acceptance: "Rollback restores the
 *   prior version", docs/00 principle 10).
 * - Both boundary tables are declared in one module so the two circular
 *   references (`vivrs → vivr_versions` draft/published pointers and
 *   `vivr_versions → vivrs`) need no deferred constraints: pointers are
 *   nullable and set after the version rows exist.
 *
 * Star-number association (docs/04 setup) is intentionally NOT a column yet:
 * docs/01 says not to add nullable FKs for future capabilities unless required
 * by the current slice, and the association requires the ownership model that
 * arrives in later phases.
 */

export const vivrs = pgTable(
  "vivrs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("draft"),
    brandColor: text("brand_color").notNull().default(VIVR_DEFAULT_BRAND_COLOR),
    themeMode: text("theme_mode").notNull().default("light"),
    logoImageUrl: text("logo_image_url"),
    coverImageUrl: text("cover_image_url"),
    currentDraftVersionId: uuid("current_draft_version_id").references(
      () => vivrVersions.id,
    ),
    currentPublishedVersionId: uuid("current_published_version_id").references(
      () => vivrVersions.id,
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("vivrs_slug_unique").on(table.slug),
    index("vivrs_organization_idx").on(table.organizationId),
    index("vivrs_status_idx").on(table.status),
    index("vivrs_organization_status_idx").on(table.organizationId, table.status),
    check(
      "vivrs_slug_check",
      sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`,
    ),
    check(
      "vivrs_status_check",
      sql`${table.status} IN (${sql.raw(VIVR_STATUSES.map((status) => `'${status}'`).join(", "))})`,
    ),
    check(
      "vivrs_theme_mode_check",
      sql`${table.themeMode} IN (${sql.raw(VIVR_THEME_MODES.map((mode) => `'${mode}'`).join(", "))})`,
    ),
    check(
      "vivrs_brand_color_check",
      sql`${table.brandColor} ~ '^#[0-9a-fA-F]{6}$'`,
    ),
  ],
);

export const vivrVersions = pgTable(
  "vivr_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vivrId: uuid("vivr_id")
      .notNull()
      .references(() => vivrs.id),
    /**
     * Monotonically increasing per-VIVR version number. The current published
     * version is selected by the `vivrs.current_published_version_id` pointer,
     * not by the greatest sequence, because rollback re-points to an older
     * (still immutable) version.
     */
    sequence: integer("sequence").notNull(),
    /**
     * Self-contained VIVR configuration snapshot (profile, theme, ordered
     * blocks). For the draft version this is the editable draft; for published
     * versions it is the immutable snapshot written at publish time.
     */
    configJson: jsonb("config_json").$type<VivrConfig>().notNull(),
    /** Set when the version is published; NULL means this is the draft. */
    publishedAt: timestamp("published_at", { withTimezone: true }),
    /** The actor who published this version (NULL for the draft). */
    publishedById: uuid("published_by_id").references(() => actors.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("vivr_versions_vivr_sequence_unique").on(
      table.vivrId,
      table.sequence,
    ),
    uniqueIndex("vivr_versions_one_draft")
      .on(table.vivrId)
      .where(sql`${table.publishedAt} IS NULL`),
    index("vivr_versions_vivr_published_idx").on(table.vivrId, table.publishedAt),
    index("vivr_versions_published_idx").on(table.publishedAt),
    check("vivr_versions_sequence_check", sql`${table.sequence} >= 1`),
  ],
);

export type VivrRow = typeof vivrs.$inferSelect;
export type NewVivrRow = typeof vivrs.$inferInsert;
export type VivrVersionRow = typeof vivrVersions.$inferSelect;
export type NewVivrVersionRow = typeof vivrVersions.$inferInsert;