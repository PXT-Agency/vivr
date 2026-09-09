import { and, desc, eq, sql } from "drizzle-orm";

import type { OrganizationId } from "@/types";
import type { VivrConfig } from "@/types/vivr";
import type { Db } from "@/server/db";
import {
  vivrs,
  vivrVersions,
  type VivrVersionRow,
} from "@/server/db/schema";

/**
 * VIVR version read/write repository (drafts + immutable published versions).
 *
 * Immutability invariant (docs/00 principle 10, docs/04 "create a new
 * immutable VIVR version"): published versions are never edited in place.
 * All mutable draft edits go through `updateDraftConfig`, which only touches
 * the single row whose `published_at` is NULL and re-validates the org
 * boundary by joining the owning VIVR.
 *
 * All reads are tenant-scoped: callers pass the live `organizationId` derived
 * from the Clerk session, and every query joins `vivrs.organization_id` so
 * cross-tenant reads/mutations can never succeed even with a guessed id.
 */
export class VivrVersionRepository {
  constructor(private readonly db: Db) {}

  async getDraft(
    vivrId: string,
    organizationId: OrganizationId,
  ): Promise<VivrVersionRow | null> {
    const [row] = await this.db
      .select({ version: vivrVersions })
      .from(vivrVersions)
      .innerJoin(vivrs, eq(vivrVersions.vivrId, vivrs.id))
      .where(
        and(
          eq(vivrVersions.vivrId, vivrId),
          eq(vivrs.organizationId, organizationId),
          sql`${vivrVersions.publishedAt} IS NULL`,
        ),
      )
      .limit(1);
    return row?.version ?? null;
  }

  async requireDraft(
    vivrId: string,
    organizationId: OrganizationId,
  ): Promise<VivrVersionRow> {
    const draft = await this.getDraft(vivrId, organizationId);
    if (!draft) {
      throw new Error(
        `VIVR draft not found for vivr ${vivrId} in organization ${organizationId}`,
      );
    }
    return draft;
  }

  /**
   * Replace the draft block configuration. Only the live draft
   * (`published_at IS NULL`) can be mutated; published versions throw.
   */
  async updateDraftConfig(
    vivrId: string,
    organizationId: OrganizationId,
    config: VivrConfig,
  ): Promise<VivrVersionRow> {
    const draft = await this.requireDraft(vivrId, organizationId);
    if (draft.publishedAt) {
      throw new Error("Published VIVR versions are immutable.");
    }
    const [row] = await this.db
      .update(vivrVersions)
      .set({ configJson: config, updatedAt: new Date() })
      .where(eq(vivrVersions.id, draft.id))
      .returning();
    return row;
  }

  async listByVivr(
    vivrId: string,
    organizationId: OrganizationId,
  ): Promise<VivrVersionRow[]> {
    return this.db
      .select({ version: vivrVersions })
      .from(vivrVersions)
      .innerJoin(vivrs, eq(vivrVersions.vivrId, vivrs.id))
      .where(
        and(
          eq(vivrVersions.vivrId, vivrId),
          eq(vivrs.organizationId, organizationId),
        ),
      )
      .orderBy(desc(vivrVersions.sequence))
      .then((rows) => rows.map((row) => row.version));
  }

  async findByIdForOrganization(
    vivrId: string,
    organizationId: OrganizationId,
    versionId: string,
  ): Promise<VivrVersionRow | null> {
    const [row] = await this.db
      .select({ version: vivrVersions })
      .from(vivrVersions)
      .innerJoin(vivrs, eq(vivrVersions.vivrId, vivrs.id))
      .where(
        and(
          eq(vivrVersions.id, versionId),
          eq(vivrVersions.vivrId, vivrId),
          eq(vivrs.organizationId, organizationId),
        ),
      )
      .limit(1);
    return row?.version ?? null;
  }

  async maxSequence(vivrId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: sql<number>`max(${vivrVersions.sequence})` })
      .from(vivrVersions)
      .where(eq(vivrVersions.vivrId, vivrId));
    return row?.value ?? 0;
  }
}

export type VivrVersionsRepository = VivrVersionRepository;

export function createVivrVersionRepository(db: Db): VivrVersionsRepository {
  return new VivrVersionRepository(db);
}

export type { VivrVersionRow };