import type { JsonValue } from "./index";
import type { VivrBlockType } from "@/config/vivr";

/**
 * A single ordered block on a one-page VIVR (docs/03 conceptual JSON, docs/04
 * action contracts). `config` shape is validated per `type` by the block
 * config schemas in `src/server/services/vivr/schemas.ts`; for sensitive or
 * provider-backed actions the config stores references to internal records,
 * never raw secrets (docs/04 Step 3).
 */
export interface VivrBlock {
  id: string;
  type: VivrBlockType;
  enabled: boolean;
  title: string;
  config?: JsonValue | null;
}

/**
 * Self-contained, versionable VIVR configuration carried by a
 * `vivr_versions.config_json` snapshot. Published versions never mutate; the
 * public runtime (Phase 7) resolves a VIVR to its current published version
 * and renders this JSON server-side.
 */
export interface VivrConfig {
  schemaVersion: 1;
  profile: {
    name: string;
    description?: string;
  };
  theme: {
    primary: string;
    mode: "light" | "dark";
    logoImageUrl?: string | null;
    coverImageUrl?: string | null;
  };
  blocks: VivrBlock[];
}

export type { JsonValue };