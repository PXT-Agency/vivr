import { z } from "zod";

import {
  isVivrSupportedBlockType,
  VIVR_BLOCK_TITLE_MAX_LENGTH,
  VIVR_BLOCK_TYPES,
  VIVR_DEFAULT_BRAND_COLOR,
} from "@/config/vivr";
import type { OrganizationId } from "@/types";
import type { VivrBlock, VivrConfig } from "@/types/vivr";
import type { JsonValue } from "@/types";
import type { Db } from "@/server/db";
import { createVivrRepository, type VivrsRepository } from "@/server/repositories/vivrs";
import {
  createVivrVersionRepository,
  type VivrVersionsRepository,
} from "@/server/repositories/vivr-versions";
import {
  parseVivrBlock,
  parseVivrConfig,
  rebaseDraftConfig,
  vivrBrandColorSchema,
  vivrDescriptionSchema,
  vivrImageUrlSchema,
  vivrSlugSchema,
  vivrThemeModeSchema,
  vivrTitleSchema,
} from "./schemas";
import {
  withBlockAppended,
  withBlockDuplicated,
  withBlockEnabled,
  withBlockMoved,
  withBlockReplaced,
  withoutBlock,
} from "./blocks";

export interface VivrServiceDeps {
  vivrs: VivrsRepository;
  versions: VivrVersionsRepository;
}

const nullableImageUrlSchema = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.string().trim().url("Image URL must be a valid URL.").max(512, "Image URL is too long."),
);

export const vivrCreateInputSchema = z.object({
  title: vivrTitleSchema,
  slug: vivrSlugSchema,
  description: vivrDescriptionSchema,
  brandColor: vivrBrandColorSchema.optional(),
  themeMode: vivrThemeModeSchema.optional(),
  logoImageUrl: nullableImageUrlSchema.optional(),
  coverImageUrl: nullableImageUrlSchema.optional(),
}).strict();

export const vivrUpdatePropertiesInputSchema = z.object({
  title: vivrTitleSchema.optional(),
  slug: vivrSlugSchema.optional(),
  description: vivrDescriptionSchema.optional(),
  brandColor: vivrBrandColorSchema.optional(),
  themeMode: vivrThemeModeSchema.optional(),
  logoImageUrl: nullableImageUrlSchema.optional(),
  coverImageUrl: nullableImageUrlSchema.optional(),
}).strict();

const blockTitleSchema = z
  .string()
  .trim()
  .min(1, "Block label is required.")
  .max(VIVR_BLOCK_TITLE_MAX_LENGTH);

const addBlockInputSchema = z
  .object({
    type: z.enum(VIVR_BLOCK_TYPES),
    title: blockTitleSchema,
    config: z.unknown(),
  })
  .strict();

const updateBlockInputSchema = z
  .object({
    title: blockTitleSchema.optional(),
    enabled: z.boolean().optional(),
    config: z.unknown().optional(),
  })
  .strict();

const moveBlockInputSchema = z.enum(["up", "down"]);

const setBlockEnabledInputSchema = z.boolean();

/**
 * One-page VIVR builder domain service (docs/04).
 *
 * Authorization is enforced by the caller (server actions / loaders) via
 * `requireOrganizationRole`; this service only ever receives the
 * session-derived `organizationId` and every repository call is scoped to it,
 * so Tenant A can never read or edit Tenant B's VIVR even with a guessed id.
 *
 * All draft mutations follow the same pattern: load the current draft config,
 * apply a pure operation, persist the draft snapshot. Recipe-handling (publish
 * = immutable snapshot + pointer move, rollback = pointer move only) lives in
 * the repositories under a single transaction.
 */
export class VivrService {
  constructor(private readonly deps: VivrServiceDeps) {}

  async createVivr(organizationId: OrganizationId, input: unknown) {
    const parsed = vivrCreateInputSchema.parse(input);
    const slug = parsed.slug;
    const normalizedSlug = slug.toLowerCase().trim();

    const dup = await this.deps.vivrs.findBySlug(normalizedSlug);
    if (dup) {
      throw new Error(`The public URL "${slug}" is already taken by another VIVR.`);
    }

    return this.deps.vivrs.createWithDraft({
      organizationId,
      slug: normalizedSlug,
      title: parsed.title,
      description: parsed.description,
      brandColor: parsed.brandColor ?? VIVR_DEFAULT_BRAND_COLOR,
      themeMode: parsed.themeMode ?? "light",
      logoImageUrl: parsed.logoImageUrl ?? null,
      coverImageUrl: parsed.coverImageUrl ?? null,
    });
  }

  async updateCoreProperties(organizationId: OrganizationId, vivrId: string, input: unknown) {
    const parsed = vivrUpdatePropertiesInputSchema.parse(input);

    if (parsed.slug !== undefined) {
      const normalizedSlug = parsed.slug.toLowerCase().trim();
      if (await this.deps.vivrs.slugTaken(normalizedSlug, vivrId)) {
        throw new Error(`The public URL "${parsed.slug}" is already taken by another VIVR.`);
      }
      parsed.slug = normalizedSlug;
    }

    const updated = await this.deps.vivrs.updateProperties(organizationId, vivrId, parsed);
    if (!updated) {
      throw new Error("VIVR not found in this organization.");
    }

    const draft = await this.deps.versions.requireDraft(vivrId, organizationId);
    if (draft.publishedAt) {
      throw new Error("Published VIVR versions are immutable.");
    }
    const config = parseVivrConfig(draft.configJson);
    const rebased = rebaseDraftConfig(config, {
      title: parsed.title ?? config.profile.name,
      description: parsed.description ?? (config.profile.description ?? ""),
      brandColor: parsed.brandColor ?? config.theme.primary,
      themeMode: parsed.themeMode ?? config.theme.mode,
      logoImageUrl: parsed.logoImageUrl ?? null,
      coverImageUrl: parsed.coverImageUrl ?? null,
    });
    await this.deps.versions.updateDraftConfig(vivrId, organizationId, rebased);
    return updated;
  }

  async addBlock(organizationId: OrganizationId, vivrId: string, input: unknown) {
    const parsed = addBlockInputSchema.parse(input);
    if (!isVivrSupportedBlockType(parsed.type)) {
      throw new Error("This block type is not available yet.");
    }

    const block: VivrBlock = {
      id: withBlockAppendedId(),
      type: parsed.type,
      enabled: true,
      title: parsed.title,
      config: (parsed.config ?? null) as JsonValue | null,
    };
    const validated = normalizeBlock(block);

    const config = await this.loadDraftConfig(organizationId, vivrId);
    const next = withBlockAppended(config.blocks, validated);
    config.blocks = next;
    await this.saveDraftConfig(organizationId, vivrId, config);
    return validated;
  }

  async updateBlock(
    organizationId: OrganizationId,
    vivrId: string,
    blockId: string,
    input: unknown,
  ) {
    const patch = updateBlockInputSchema.parse(input);
    const config = await this.loadDraftConfig(organizationId, vivrId);

    const existing = config.blocks.find((candidate) => candidate.id === blockId);
    if (!existing) {
      throw new Error("Block not found.");
    }

    const merged: VivrBlock = {
      id: blockId,
      type: existing.type,
      enabled: patch.enabled ?? existing.enabled,
      title: patch.title ?? existing.title,
      config: patch.config !== undefined ? (patch.config as JsonValue | null) : existing.config,
    };
    const validated = normalizeBlock(merged);

    config.blocks = withBlockReplaced(config.blocks, blockId, validated);
    await this.saveDraftConfig(organizationId, vivrId, config);
    return validated;
  }

  async removeBlock(organizationId: OrganizationId, vivrId: string, blockId: string) {
    const config = await this.loadDraftConfig(organizationId, vivrId);
    config.blocks = withoutBlock(config.blocks, blockId);
    await this.saveDraftConfig(organizationId, vivrId, config);
  }

  async moveBlock(
    organizationId: OrganizationId,
    vivrId: string,
    blockId: string,
    direction: unknown,
  ) {
    const parsedDirection = moveBlockInputSchema.parse(direction);
    const config = await this.loadDraftConfig(organizationId, vivrId);
    config.blocks = withBlockMoved(config.blocks, blockId, parsedDirection);
    await this.saveDraftConfig(organizationId, vivrId, config);
  }

  async duplicateBlock(organizationId: OrganizationId, vivrId: string, blockId: string) {
    const config = await this.loadDraftConfig(organizationId, vivrId);
    config.blocks = withBlockDuplicated(config.blocks, blockId);
    await this.saveDraftConfig(organizationId, vivrId, config);
  }

  async setBlockEnabled(
    organizationId: OrganizationId,
    vivrId: string,
    blockId: string,
    enabled: unknown,
  ) {
    const parsedEnabled = setBlockEnabledInputSchema.parse(enabled);
    const config = await this.loadDraftConfig(organizationId, vivrId);
    config.blocks = withBlockEnabled(config.blocks, blockId, parsedEnabled);
    await this.saveDraftConfig(organizationId, vivrId, config);
  }

  /**
   * Validate the entire draft config with Zod, then atomically publish a new
   * immutable version and move the live pointer (docs/04 Step 6).
   */
  async publish(organizationId: OrganizationId, vivrId: string, publisherActorId: string) {
    const config = await this.loadDraftConfig(organizationId, vivrId);
    const validated = parseVivrConfig(config);
    if (validated.blocks.length === 0) {
      throw new Error("Add at least one block before publishing.");
    }
    return this.deps.vivrs.publishFromDraft(organizationId, vivrId, publisherActorId);
  }

  async rollback(organizationId: OrganizationId, vivrId: string, versionId: string) {
    return this.deps.vivrs.rollbackToVersion(organizationId, vivrId, versionId);
  }

  private async loadDraftConfig(organizationId: OrganizationId, vivrId: string): Promise<VivrConfig> {
    const draft = await this.deps.versions.requireDraft(vivrId, organizationId);
    if (draft.publishedAt) {
      throw new Error("Published VIVR versions are immutable.");
    }
    return parseVivrConfig(draft.configJson);
  }

  private async saveDraftConfig(
    organizationId: OrganizationId,
    vivrId: string,
    config: VivrConfig,
  ): Promise<void> {
    const validated = parseVivrConfig(config);
    await this.deps.versions.updateDraftConfig(organizationId, vivrId, validated);
  }
}

function normalizeBlock(block: VivrBlock): VivrBlock {
  const parsed = parseVivrBlock({
    id: block.id,
    type: block.type,
    enabled: block.enabled,
    title: block.title,
    config: block.config,
  });
  return parsed as VivrBlock;
}

function withBlockAppendedId(): string {
  return globalThis.crypto.randomUUID();
}

export function createVivrService(db: Db): VivrService {
  return new VivrService({
    vivrs: createVivrRepository(db),
    versions: createVivrVersionRepository(db),
  });
}