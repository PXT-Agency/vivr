/**
 * Single source of truth for machine values used by the one-page VIVR
 * builder (docs/04) and the future public runtime (docs/05).
 *
 * A VIVR is one persistent page with ordered blocks. Block configuration is
 * JSON-schema driven and versionable (docs/00 principles 9-10): block configs
 * live inside an immutable `vivr_versions.config_json` snapshot, not in
 * separate relational columns for every property.
 *
 * All documented block types are registered below so stored drafts/versions
 * never break when a type is upgraded from "deferred" to "supported".
 */

export const VIVR_SCHEMA_VERSION = 1 as const;

export const VIVR_STATUSES = ["draft", "published", "archived"] as const;
export type VivrStatus = (typeof VIVR_STATUSES)[number];

export const VIVR_THEME_MODES = ["light", "dark"] as const;
export type VivrThemeMode = (typeof VIVR_THEME_MODES)[number];

export const VIVR_DEFAULT_BRAND_COLOR = "#4154a3" as const;

export const VIVR_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const VIVR_SLUG_MAX_LENGTH = 60;
export const VIVR_TITLE_MAX_LENGTH = 120;
export const VIVR_DESCRIPTION_MAX_LENGTH = 500;
export const VIVR_BLOCK_TITLE_MAX_LENGTH = 80;
export const VIVR_BLOCKS_MAX = 50;

/**
 * Every block type documented in docs/04 (Step 2). Stored drafts and
 * published versions keep these machine values; the UI maps them to the
 * human-readable labels in {@link VIVR_BLOCK_TYPE_META}.
 */
export const VIVR_BLOCK_TYPES = [
  "link",
  "call",
  "whatsapp",
  "sms",
  "website",
  "map",
  "emergency_report",
  "weather",
  "flood_map",
  "shelter_finder",
  "safety_guide",
  "file",
  "form",
  "alert",
  "social",
  "payment",
  "voice_agent",
  "contact_directory",
] as const;
export type VivrBlockType = (typeof VIVR_BLOCK_TYPES)[number];

/**
 * Block types the builder can create and configure in this phase. The
 * remaining documented types are registered (validated structurally so old
 * configs never break) but not yet selectable; see VIVR_BLOCK_TYPE_META.
 */
export const VIVR_SUPPORTED_BLOCK_TYPES = [
  "link",
  "call",
  "whatsapp",
  "sms",
  "website",
  "map",
  "file",
  "alert",
  "social",
  "form",
] as const;
export type VivrSupportedBlockType = (typeof VIVR_SUPPORTED_BLOCK_TYPES)[number];

export interface VivrBlockTypeMeta {
  label: string;
  description: string;
  supported: boolean;
}

/**
 * Human-facing registry for the "Add block" menu. `supported: false` marks
 * documented types that are deferred (emergency_reports, live weather/flood,
 * shelter finder, safety guide, payment checkout, AI voice agent, contact
 * directory) — the roadmap warns against building every block type before the
 * core builder works (docs/12).
 */
export const VIVR_BLOCK_TYPE_META: Record<VivrBlockType, VivrBlockTypeMeta> = {
  link: { label: "Link", description: "Open an external URL", supported: true },
  call: { label: "Call", description: "Launch the phone dialer", supported: true },
  whatsapp: { label: "WhatsApp", description: "Open a WhatsApp chat", supported: true },
  sms: { label: "SMS", description: "Compose a text message", supported: true },
  website: { label: "Website", description: "Link to a website", supported: true },
  map: { label: "Map", description: "Open maps and directions", supported: true },
  file: { label: "File / document", description: "Link to a download", supported: true },
  alert: { label: "Alert / notice", description: "Show a public notice", supported: true },
  social: { label: "Social links", description: "Row of social profile links", supported: true },
  form: { label: "Form", description: "Contact form (config)", supported: true },
  emergency_report: {
    label: "Emergency report",
    description: "Emergency report action",
    supported: false,
  },
  weather: { label: "Weather", description: "Live weather block", supported: false },
  flood_map: { label: "Flood map", description: "Live flood map", supported: false },
  shelter_finder: { label: "Shelter finder", description: "Find safe shelters", supported: false },
  safety_guide: { label: "Safety guide", description: "Safety guide content", supported: false },
  payment: { label: "Payment / checkout", description: "External checkout link", supported: false },
  voice_agent: { label: "AI voice agent", description: "Call an AI voice agent", supported: false },
  contact_directory: {
    label: "Contact directory",
    description: "Agency / office directory",
    supported: false,
  },
};

export function isVivrStatus(value: unknown): value is VivrStatus {
  return (
    typeof value === "string" &&
    (VIVR_STATUSES as readonly string[]).includes(value)
  );
}

export function isVivrThemeMode(value: unknown): value is VivrThemeMode {
  return (
    typeof value === "string" &&
    (VIVR_THEME_MODES as readonly string[]).includes(value)
  );
}

export function isVivrBlockType(value: unknown): value is VivrBlockType {
  return (
    typeof value === "string" &&
    (VIVR_BLOCK_TYPES as readonly string[]).includes(value)
  );
}

export function isVivrSupportedBlockType(
  value: unknown,
): value is VivrSupportedBlockType {
  return (
    typeof value === "string" &&
    (VIVR_SUPPORTED_BLOCK_TYPES as readonly string[]).includes(value)
  );
}

/**
 * Normalize a user-entered public slug: lowercase, diacritics stripped,
 * non-alphanumeric runs collapsed to hyphens, leading/trailing hyphens
 * removed, capped at the maximum length. Returns "" when nothing remains.
 */
export function normalizeVivrSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, VIVR_SLUG_MAX_LENGTH);
}

export const VIVR_SOCIAL_PLATFORMS = [
  "facebook",
  "x",
  "instagram",
  "tiktok",
  "youtube",
  "linkedin",
  "whatsapp",
  "other",
] as const;
export type VivrSocialPlatform = (typeof VIVR_SOCIAL_PLATFORMS)[number];

export function isVivrSocialPlatform(value: unknown): value is VivrSocialPlatform {
  return (
    typeof value === "string" &&
    (VIVR_SOCIAL_PLATFORMS as readonly string[]).includes(value)
  );
}