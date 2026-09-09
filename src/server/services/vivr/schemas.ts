import { z } from "zod";

import {
  VIVR_BLOCK_TITLE_MAX_LENGTH,
  VIVR_BLOCK_TYPES,
  VIVR_BLOCKS_MAX,
  VIVR_DESCRIPTION_MAX_LENGTH,
  VIVR_SCHEMA_VERSION,
  VIVR_SLUG_MAX_LENGTH,
  VIVR_SLUG_PATTERN,
  VIVR_TITLE_MAX_LENGTH,
  VIVR_SOCIAL_PLATFORMS,
  VIVR_THEME_MODES,
} from "@/config/vivr";
import type { VivrBlock, VivrBlockType, VivrConfig } from "@/types/vivr";

/**
 * Zod schemas for the one-page VIVR configuration (docs/04 Step 6 requires
 * block configs to be validated with Zod before publish).
 *
 * Block `config` fields are the action contract for each type. Provider-backed
 * types that are still deferred (docs/12: do not build every block type
 * before the core builder works) accept arbitrary JSON structurally so stored
 * drafts/versions never fail validation; the builder only offers supported
 * types and the renderer shows a placeholder for deferred ones.
 */

export const vivrSlugSchema = z
  .string()
  .trim()
  .min(1, "Public URL is required.")
  .max(VIVR_SLUG_MAX_LENGTH, `Public URL must be ${VIVR_SLUG_MAX_LENGTH} characters or fewer.`)
  .regex(VIVR_SLUG_PATTERN, "Use lowercase letters, numbers and single hyphens.");

export const vivrTitleSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(VIVR_TITLE_MAX_LENGTH, `Name must be ${VIVR_TITLE_MAX_LENGTH} characters or fewer.`);

export const vivrDescriptionSchema = z
  .string()
  .trim()
  .max(VIVR_DESCRIPTION_MAX_LENGTH, `Description must be ${VIVR_DESCRIPTION_MAX_LENGTH} characters or fewer.`)
  .default("");

export const vivrBrandColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Brand color must be a hex color like #4154a3.");

export const vivrThemeModeSchema = z.enum(VIVR_THEME_MODES);

export const vivrImageUrlSchema = z
  .string()
  .trim()
  .url("Image URL must be a valid URL.")
  .max(512, "Image URL is too long.")
  .nullable()
  .optional();

const httpUrlSchema = z
  .string()
  .trim()
  .url("URL must be a valid URL.")
  .max(512, "URL is too long.")
  .refine((value) => /^https?:\/\//i.test(value), {
    message: "URL must start with http:// or https://.",
  });

const phoneSchema = z
  .string()
  .trim()
  .min(3, "Phone number is too short.")
  .max(24, "Phone number is too long.")
  .regex(/^[+0-9()\s.-]+$/, "Use digits, spaces and +() .- only.");

const blockedContentSchema = z.string().trim().min(1).max(500);

const linkConfigSchema = z.object({ url: httpUrlSchema }).strict();

const callConfigSchema = z.object({ phone: phoneSchema }).strict();

const whatsappConfigSchema = z
  .object({
    phone: phoneSchema,
    message: z.string().max(200).optional(),
  })
  .strict();

const smsConfigSchema = z
  .object({
    phone: phoneSchema,
    message: z.string().max(160).optional(),
  })
  .strict();

const mapConfigSchema = z
  .object({
    longitude: z.number().min(-180).max(180),
    latitude: z.number().min(-90).max(90),
    query: z.string().trim().max(120).optional(),
  })
  .strict();

const fileConfigSchema = z
  .object({
    url: httpUrlSchema,
    fileName: z.string().trim().max(120).optional(),
  })
  .strict();

const alertConfigSchema = z
  .object({
    content: blockedContentSchema,
    severity: z.enum(["info", "warning", "danger"]),
  })
  .strict();

const socialConfigSchema = z
  .object({
    links: z
      .array(
        z
          .object({
            platform: z.enum(VIVR_SOCIAL_PLATFORMS),
            url: httpUrlSchema,
          })
          .strict(),
      )
      .min(1, "Add at least one social link.")
      .max(12, "At most 12 social links."),
  })
  .strict();

const formConfigSchema = z
  .object({
    fields: z
      .array(
        z
          .object({
            id: z.string().trim().min(1).max(64),
            label: z.string().trim().min(1).max(80),
            type: z.enum(["text", "textarea", "email", "tel"]),
            required: z.boolean().default(false),
          })
          .strict(),
      )
      .min(1, "Add at least one form field.")
      .max(12, "At most 12 form fields."),
    submitAction: z
      .discriminatedUnion("kind", [
        z.object({ kind: z.literal("mailto"), email: z.string().email().max(120) }).strict(),
        z.object({ kind: z.literal("external"), url: httpUrlSchema }).strict(),
      ]),
  })
  .strict();

/**
 * Deferred block types accept arbitrary JSON so legacy drafts/versions keep
 * validating. The renderer shows a "not available yet" placeholder.
 */
const deferredConfigSchema = z.record(z.string(), z.unknown());

const blockConfigSchemas: Record<VivrBlockType, z.ZodType> = {
  link: linkConfigSchema,
  website: linkConfigSchema,
  call: callConfigSchema,
  whatsapp: whatsappConfigSchema,
  sms: smsConfigSchema,
  map: mapConfigSchema,
  file: fileConfigSchema,
  alert: alertConfigSchema,
  social: socialConfigSchema,
  form: formConfigSchema,
  emergency_report: deferredConfigSchema,
  weather: deferredConfigSchema,
  flood_map: deferredConfigSchema,
  shelter_finder: deferredConfigSchema,
  safety_guide: deferredConfigSchema,
  payment: deferredConfigSchema,
  voice_agent: deferredConfigSchema,
  contact_directory: deferredConfigSchema,
};

const blockIdSchema = z.string().trim().min(1, "Block id is required.").max(64);

export const vivrBlockSchema = z
  .object({
    id: blockIdSchema,
    type: z.enum(VIVR_BLOCK_TYPES),
    enabled: z.boolean().default(true),
    title: z
      .string()
      .trim()
      .min(1, "Block label is required.")
      .max(VIVR_BLOCK_TITLE_MAX_LENGTH, `Block label must be ${VIVR_BLOCK_TITLE_MAX_LENGTH} characters or fewer.`),
    config: z.unknown(),
  })
  .superRefine((block, ctx) => {
    const configSchema = blockConfigSchemas[block.type];
    if (!configSchema) return;
    const result = configSchema.safeParse(block.config === undefined ? null : block.config);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({
          code: "custom",
          message: `${block.type} config: ${issue.message}`,
          path: ["config", ...issue.path],
        });
      }
    }
  });

export interface ParsedVivrBlock {
  id: string;
  type: VivrBlockType;
  enabled: boolean;
  title: string;
  config: unknown;
}

export function parseVivrBlock(value: unknown): ParsedVivrBlock {
  const parsed = vivrBlockSchema.parse(value);
  return {
    id: parsed.id,
    type: parsed.type,
    enabled: parsed.enabled,
    title: parsed.title,
    config: parsed.config,
  };
}

/**
 * Full versionable configuration carried by `vivr_versions.config_json`.
 * Publishing validates the whole snapshot with this schema before a new
 * immutable version is created (docs/04 Step 6).
 */
export const vivrConfigSchema = z
  .object({
    schemaVersion: z.literal(VIVR_SCHEMA_VERSION),
    profile: z
      .object({
        name: z
          .string()
          .trim()
          .min(1, "VIVR name is required.")
          .max(VIVR_TITLE_MAX_LENGTH),
        description: z.string().max(VIVR_DESCRIPTION_MAX_LENGTH).default(""),
      })
      .strict(),
    theme: z
      .object({
        primary: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
        mode: z.enum(VIVR_THEME_MODES),
        logoImageUrl: vivrImageUrlSchema,
        coverImageUrl: vivrImageUrlSchema,
      })
      .strict(),
    blocks: z.array(vivrBlockSchema).max(VIVR_BLOCKS_MAX),
  })
  .strict();

export function parseVivrConfig(value: unknown): VivrConfig {
  return vivrConfigSchema.parse(value) as VivrConfig;
}

/**
 * Build the initial draft configuration for a new VIVR. Profile/theme mirror
 * the normalized column values; the block list starts empty.
 */
export function buildInitialDraftConfig(input: {
  title: string;
  description: string;
  brandColor: string;
  themeMode: "light" | "dark";
  logoImageUrl?: string | null;
  coverImageUrl?: string | null;
}): VivrConfig {
  return {
    schemaVersion: VIVR_SCHEMA_VERSION,
    profile: { name: input.title, description: input.description },
    theme: {
      primary: input.brandColor,
      mode: input.themeMode,
      logoImageUrl: input.logoImageUrl ?? null,
      coverImageUrl: input.coverImageUrl ?? null,
    },
    blocks: [],
  };
}

/**
 * Rebase the current draft config onto edited core properties, preserving
 * existing blocks. Used by the "edit core properties" flow so the draft
 * snapshot and the normalized columns never diverge.
 */
export function rebaseDraftConfig(
  config: VivrConfig,
  input: {
    title: string;
    description: string;
    brandColor: string;
    themeMode: "light" | "dark";
    logoImageUrl?: string | null;
    coverImageUrl?: string | null;
  },
): VivrConfig {
  const blocks: VivrBlock[] = config.blocks.map((block) => ({ ...block }));
  return {
    schemaVersion: VIVR_SCHEMA_VERSION,
    profile: { name: input.title, description: input.description },
    theme: {
      primary: input.brandColor,
      mode: input.themeMode,
      logoImageUrl: input.logoImageUrl ?? null,
      coverImageUrl: input.coverImageUrl ?? null,
    },
    blocks,
  };
}

export function isVivrConfig(value: unknown): boolean {
  return isVivrConfig;
}