import { notFound } from "next/navigation";

import { ORGANIZATION_EDITOR_ROLES, ORGANIZATION_ROLES, type OrganizationRole } from "@/config/auth";
import { AuthContextError, requireOrganizationRole } from "@/server/auth";
import { createDatabase } from "@/server/db";
import { createOrganizationRepository } from "@/server/repositories/organizations";
import { createVivrRepository, type VivrListRow } from "@/server/repositories/vivrs";
import { createVivrVersionRepository } from "@/server/repositories/vivr-versions";
import { parseVivrConfig } from "@/server/services/vivr/schemas";
import type { VivrVersionRow } from "@/server/db/schema";
import type { VivrConfig } from "@/types/vivr";

/**
 * Roles allowed to view the VIVR list and open the builder. Any organization
 * member may read their tenant's VIVRs; editors/admin additionally get the
 * `canEdit` flag. VIVR mutations are separately gated on the editor roles in
 * the server actions, so `org:member` renders a read-only builder.
 */
export const VIVR_VIEWER_ROLES: readonly OrganizationRole[] = ORGANIZATION_ROLES;

export interface VivrListContext {
  organizationId: string;
  organizationRole: OrganizationRole;
}

export interface VivrListEntry {
  id: string;
  slug: string;
  title: string;
  status: string;
  draftSequence: number | null;
  draftUpdatedAt: Date | null;
  publishedSequence: number | null;
  publishedAt: Date | null;
  publicUrl: string;
}

export interface VivrList {
  context: VivrListContext;
  vivrs: VivrListEntry[];
}

/**
 * Tenant VIVR listing. Tenant identity is resolved server-side from the Clerk
 * session; an authenticated user without an active organization gets `null`
 * (the "select an organization" state).
 */
export async function getVivrList(): Promise<VivrList | null> {
  const context = await getViewerContext();
  if (!context) return null;

  const { client, db } = createDatabase();
  try {
    const vivrRepo = createVivrRepository(db);
    const rows = await vivrRepo.listForOrganization(context.organizationId);
    return {
      context,
      vivrs: rows.map((row) => toListEntry(row)),
    };
  } finally {
    await client.end();
  }
}

export interface VivrVersionView {
  id: string;
  sequence: number;
  publishedAt: Date | null;
  isDraft: boolean;
  isCurrent: boolean;
}

export interface VivrBuilderView {
  context: VivrListContext;
  canEdit: boolean;
  organizationName: string | null;
  vivr: {
    id: string;
    slug: string;
    title: string;
    description: string;
    status: string;
    brandColor: string;
    themeMode: string;
    logoImageUrl: string | null;
    coverImageUrl: string | null;
    publicUrl: string;
    updatedAt: Date;
  };
  draft: {
    id: string;
    sequence: number;
    updatedAt: Date;
    config: VivrConfig;
  };
  versions: VivrVersionView[];
  lastPublishedAt: Date | null;
}

/**
 * Builder payload for `/dashboard/vivr/[vivrId]`: VIVR properties, the current
 * editable draft snapshot (whose config drives both the edit controls and the
 * shared public-runtime preview renderer), and the version history.
 */
export async function getVivrBuilder(vivrId: string): Promise<VivrBuilderView | null> {
  const context = await getViewerContext();
  if (!context) return null;

  const { client, db } = createDatabase();
  try {
    const orgRepo = createOrganizationRepository(db);
    const vivrRepo = createVivrRepository(db);
    const versionRepo = createVivrVersionRepository(db);

    const [vivr, organization, versions] = await Promise.all([
      vivrRepo.findByIdForOrganization(vivrId, context.organizationId),
      orgRepo.findById(context.organizationId),
      versionRepo.listByVivr(vivrId, context.organizationId),
    ]);

    if (!vivr) {
      notFound();
    }

    const draft: VivrVersionRow | undefined = versions.find(
      (version) => version.publishedAt === null,
    );
    if (!draft) {
      notFound();
    }

    const lastPublishedAt = versions.find((version) => version.id === vivr.currentPublishedVersionId)
      ?.publishedAt ?? null;

    return {
      context,
      canEdit: ORGANIZATION_EDITOR_ROLES.includes(context.organizationRole),
      organizationName: organization?.name ?? null,
      vivr: {
        id: vivr.id,
        slug: vivr.slug,
        title: vivr.title,
        description: vivr.description,
        status: vivr.status,
        brandColor: vivr.brandColor,
        themeMode: vivr.themeMode,
        logoImageUrl: vivr.logoImageUrl,
        coverImageUrl: vivr.coverImageUrl,
        publicUrl: `/v/${vivr.slug}`,
        updatedAt: vivr.updatedAt,
      },
      draft: {
        id: draft.id,
        sequence: draft.sequence,
        updatedAt: draft.updatedAt,
        config: parseVivrConfig(draft.configJson),
      },
      versions: versions.map((version) => ({
        id: version.id,
        sequence: version.sequence,
        publishedAt: version.publishedAt,
        isDraft: version.publishedAt === null,
        isCurrent: version.id === vivr.currentPublishedVersionId,
      })),
      lastPublishedAt,
    };
  } finally {
    await client.end();
  }
}

async function getViewerContext(): Promise<VivrListContext | null> {
  try {
    const organization = await requireOrganizationRole([...VIVR_VIEWER_ROLES]);
    return {
      organizationId: organization.organizationId,
      organizationRole: organization.organizationRole,
    };
  } catch (error) {
    if (error instanceof AuthContextError && error.code === "missing_organization") {
      return null;
    }
    throw error;
  }
}

function toListEntry(row: VivrListRow): VivrListEntry {
  return {
    id: row.vivr.id,
    slug: row.vivr.slug,
    title: row.vivr.title,
    status: row.vivr.status,
    draftSequence: row.draftSequence,
    draftUpdatedAt: row.draftUpdatedAt,
    publishedSequence: row.publishedSequence,
    publishedAt: row.publishedAt,
    publicUrl: `/v/${row.vivr.slug}`,
  };
}