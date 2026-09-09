import { and, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { VivrStatus } from "@/config/vivr";
import { isVivrStatus, normalizeVivrSlug, VIVR_DEFAULT_BRAND_COLOR } from "@/config/vivr";
import type { OrganizationId } from "@/types";
import type { VivrConfig } from "@/types/vivr";
import type { Db } from "@/server/db";
import { vivrs, vivrVersions, type VivrRow, type VivrVersionRow } from "@/server/db/schema";
import { buildInitialDraftConfig } from "@/server/services/vivr/schemas";

export interface CreateVivrInput {
  organizationId: OrganizationId;
  slug: string;
  title: string;
  description?: string;
  brandColor?: string;
  themeMode?: "light" | "dark";
  logoImageUrl?: string | null;
  coverImageUrl?: string | null;
}

export interface CreatedVivr {
  vivr: VivrRow;
  draft: VivrVersionRow;
}

export interface UpdateVivrPropertiesInput {
  slug?: string;
  title?: string;
  description?: string;
  brandColor?: string;
  themeMode?: "light" | "dark";
  logoImageUrl?: string | null;
  coverImageUrl?: string | null;
}

export interface PublishedVivr {
  vivr: VivrRow;
  version: VivrVersionRow;
}

export interface VivrListRow {
  vivr: VivrRow;
  draftSequence: number | null;
  draftUpdatedAt: Date | null;
  publishedSequence: number | null;
  publishedAt: Date | null;
}

const draftVersion = alias(vivrVersions, "draft");
const publishedVersion = alias(vivrVersions, "published");

/**
 * Tenant-owned one-page VIVR repository.
 *
 * Multi-row operations (`createWithDraft`, `publishFromDraft`,
 * `rollbackToVersion` and the maintenance delete) run in a single transaction
 * so the VIVR row and its version history never diverge, satisfying "publish
 * atomically" (docs/04 Step 6).
 *
 * All queries bind `organization_id` to the session-derived organization and
 * never accept a tenant id from the browser.
 */
export class VivrRepository {
  constructor(private readonly db: Db) {}

  async createWithDraft(input: CreateVivrInput): Promise<CreatedVivr> {
    const slug = normalizeVivrSlug(input.slug);
    const brandColor = input.brandColor ?? VIVR_DEFAULT_BRAND_COLOR;
    const themeMode = input.themeMode ?? "light";
    const initialConfig = buildInitialDraftConfig({
      title: input.title,
      description: input.description ?? "",
      brandColor,
      themeMode,
      logoImageUrl: input.logoImageUrl ?? null,
      coverImageUrl: input.coverImageUrl ?? null,
    });

    return this.db.transaction(async (tx) => {
      const [vivr] = await tx
        .insert(vivrs)
        .values({
          organizationId: input.organizationId,
          slug,
          title: input.title,
          description: input.description ?? "",
          brandColor,
          themeMode,
          logoImageUrl: input.logoImageUrl ?? null,
          coverImageUrl: input.coverImageUrl ?? null,
        })
        .returning();

      const [draft] = await tx
        .insert(vivrVersions)
        .values({
          vivrId: vivr.id,
          sequence: 1,
          configJson: initialConfig,
          publishedAt: null,
          publishedById: null,
        })
        .returning();

      await tx
        .update(vivrs)
        .set({ currentDraftVersionId: draft.id, updatedAt: new Date() })
        .where(eq(vivrs.id, vivr.id));

      return { vivr, draft };
    });
  }

  async findByIdForOrganization(
    vivrId: string,
    organizationId: OrganizationId,
  ): Promise<VivrRow | null> {
    const [row] = await this.db
      .select()
      .from(vivrs)
      .where(and(eq(vivrs.id, vivrId), eq(vivrs.organizationId, organizationId)))
      .limit(1);
    return row ?? null;
  }

  async findBySlug(slug: string): Promise<VivrRow | null> {
    const [row] = await this.db.select().from(vivrs).where(eq(vivrs.slug, slug)).limit(1);
    return row ?? null;
  }

  async slugTaken(slug: string, excludeVivrId?: string): Promise<boolean> {
    const existing = await this.findBySlug(slug);
    if (!existing) return false;
    if (excludeVivrId && existing.id === excludeVivrId) return false;
    return true;
  }

  /**
   * Tenant VIVR listing with draft/published info resolved from the
   * `current_*_version_id` pointers in a single joined query.
   */
  async listForOrganization(organizationId: OrganizationId): Promise<VivrListRow[]> {
    const rows = await this.db
      .select({
        vivr: vivrs,
        draftSequence: draftVersion.sequence,
        draftUpdatedAt: draftVersion.updatedAt,
        publishedSequence: publishedVersion.sequence,
        publishedAt: publishedVersion.publishedAt,
      })
      .from(vivrs)
      .leftJoin(draftVersion, eq(vivrs.currentDraftVersionId, draftVersion.id))
      .leftJoin(publishedVersion, eq(vivrs.currentPublishedVersionId, publishedVersion.id))
      .where(eq(vivrs.organizationId, organizationId))
      .orderBy(desc(vivrs.updatedAt));
    return rows.map((row) => ({
      vivr: row.vivr,
      draftSequence: row.draftSequence ?? null,
      draftUpdatedAt: row.draftUpdatedAt ?? null,
      publishedSequence: row.publishedSequence ?? null,
      publishedAt: row.publishedAt ?? null,
    }));
  }

  /**
   * Update normalized, searchable properties. The draft config snapshot is
   * rebased separately by the service so it never diverges from the columns.
   * Returns null when the VIVR does not belong to the organization.
   */
  async updateProperties(
    vivrId: string,
    organizationId: OrganizationId,
    input: UpdateVivrPropertiesInput,
  ): Promise<VivrRow | null> {
    const [row] = await this.db
      .update(vivrs)
      .set({
        slug: input.slug !== undefined ? normalizeVivrSlug(input.slug) : undefined,
        title: input.title,
        description: input.description,
        brandColor: input.brandColor,
        themeMode: input.themeMode,
        logoImageUrl: input.logoImageUrl,
        coverImageUrl: input.coverImageUrl,
        updatedAt: new Date(),
      })
      .where(and(eq(vivrs.id, vivrId), eq(vivrs.organizationId, organizationId)))
      .returning();
    return row ?? null;
  }

  async setStatus(
    vivrId: string,
    organizationId: OrganizationId,
    status: VivrStatus,
  ): Promise<void> {
    if (!isVivrStatus(status)) {
      throw new Error(`Invalid vivr status: ${String(status)}`);
    }
    await this.db
      .update(vivrs)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(vivrs.id, vivrId), eq(vivrs.organizationId, organizationId)));
  }

  /**
   * Publish the current draft: snapshot its config into a new immutable
   * version (next sequence, `published_at = now`, publishing actor recorded)
   * and move `current_published_version_id` to it — all in one transaction
   * (docs/04 Step 6).
   *
   * The draft version row is untouched and remains the editable draft for
   * future edits. Historical published versions keep their timestamps.
   */
  async publishFromDraft(
    vivrId: string,
    organizationId: OrganizationId,
    publisherActorId: string,
  ): Promise<PublishedVivr> {
    return this.db.transaction(async (tx) => {
      const [vivr] = await tx
        .select()
        .from(vivrs)
        .where(and(eq(vivrs.id, vivrId), eq(vivrs.organizationId, organizationId)))
        .limit(1);
      if (!vivr) {
        throw new Error(`VIVR not found for publish in organization ${organizationId}`);
      }

      const [draft] = await tx
        .select()
        .from(vivrVersions)
        .where(and(eq(vivrVersions.vivrId, vivrId), sql`${vivrVersions.publishedAt} IS NULL`))
        .limit(1);
      if (!draft) {
        throw new Error(`No draft version exists to publish for vivr ${vivrId}`);
      }

      const [maxRow] = await tx
        .select({ value: sql<number>`max(${vivrVersions.sequence})` })
        .from(vivrVersions)
        .where(eq(vivrVersions.vivrId, vivrId));
      const sequence = (maxRow?.value ?? 0) + 1;

      const publishedConfig = structuredClone(draft.configJson) as VivrConfig;
      const [version] = await tx
        .insert(vivrVersions)
        .values({
          vivrId,
          sequence,
          configJson: publishedConfig,
          publishedAt: new Date(),
          publishedById: publisherActorId,
        })
        .returning();

      const [updatedVivr] = await tx
        .update(vivrs)
        .set({
          currentPublishedVersionId: version.id,
          status: vivr.status === "archived" ? "archived" : "published",
          updatedAt: new Date(),
        })
        .where(eq(vivrs.id, vivrId))
        .returning();

      return { vivr: updatedVivr, version };
    });
  }

  /**
   * Roll back the live published version to a previous published version.
   * Only the pointer on `vivrs` moves; the target version and the previously
   * published version are never mutated (docs/04 acceptance: "Rollback
   * restores the prior version").
   */
  async rollbackToVersion(
    vivrId: string,
    organizationId: OrganizationId,
    versionId: string,
  ): Promise<VivrRow> {
    return this.db.transaction(async (tx) => {
      const [vivr] = await tx
        .select()
        .from(vivrs)
        .where(and(eq(vivrs.id, vivrId), eq(vivrs.organizationId, organizationId)))
        .limit(1);
      if (!vivr) {
        throw new Error(`VIVR not found for rollback in organization ${organizationId}`);
      }

      const [target] = await tx
        .select()
        .from(vivrVersions)
        .where(eq(vivrVersions.id, versionId))
        .limit(1);
      if (!target || target.vivrId !== vivrId) {
        throw new Error(`Version ${versionId} is not part of vivr ${vivrId}`);
      }
      if (!target.publishedAt) {
        throw new Error("Cannot roll back to a draft version.");
      }

      const [updated] = await tx
        .update(vivrs)
        .set({
          currentPublishedVersionId: target.id,
          status: "published",
          updatedAt: new Date(),
        })
        .where(eq(vivrs.id, vivrId))
        .returning();
      return updated;
    });
  }

  /** Maintenance helper: hard-delete a VIVR and its versions (not a product flow). */
  async deleteByIdForOrganization(vivrId: string, organizationId: OrganizationId): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [vivr] = await tx
        .select()
        .from(vivrs)
        .where(and(eq(vivrs.id, vivrId), eq(vivrs.organizationId, organizationId)))
        .limit(1);
      if (!vivr) return;
      await tx.delete(vivrVersions).where(eq(vivrVersions.vivrId, vivrId));
      await tx.delete(vivrs).where(eq(vivrs.id, vivrId));
    });
  }
}

export type VivrsRepository = VivrRepository;

export function createVivrRepository(db: Db): VivrsRepository {
  return new VivrRepository(db);
}
