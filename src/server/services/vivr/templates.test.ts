import { describe, expect, it } from "vitest";

import { parseVivrBlock, parseVivrConfig } from "@/server/services/vivr/schemas";
import {
  getVivrTemplate,
  VIVR_TEMPLATE_KEYS,
  vivrTemplates,
} from "@/server/services/vivr/templates";
import { buildInitialDraftConfig } from "@/server/services/vivr/schemas";

describe("vivrTemplates", () => {
  it("registers the five documented seed templates", () => {
    expect(VIVR_TEMPLATE_KEYS.sort()).toEqual(
      [
        "corporate_contact_center",
        "emergency_response",
        "government_services",
        "hospital_health",
        "utility_service_outage",
      ].sort(),
    );
  });

  it("uses only supported block types with valid configs", () => {
    for (const key of VIVR_TEMPLATE_KEYS) {
      const template = vivrTemplates[key];
      expect(template.blocks.length).toBeGreaterThan(0);
      for (const block of template.blocks) {
        expect(() =>
          parseVivrBlock({
            id: "block_template",
            type: block.type,
            enabled: true,
            title: block.title,
            config: block.config,
          }),
        ).not.toThrow();
      }
    }
  });

  it("produces a config that round-trips parseVivrConfig", () => {
    for (const key of VIVR_TEMPLATE_KEYS) {
      const template = vivrTemplates[key];
      const config = buildInitialDraftConfig({
        title: "Template VIVR",
        description: template.descriptionText,
        brandColor: template.brandColor,
        themeMode: "light",
        logoImageUrl: null,
        coverImageUrl: null,
      });
      config.blocks = template.blocks.map((block, index) =>
        parseVivrBlock({
          id: `block_${index}`,
          type: block.type,
          enabled: true,
          title: block.title,
          config: block.config,
        }),
      ) as never;
      expect(() => parseVivrConfig(config)).not.toThrow();
    }
  });

  it("returns null for unknown template keys", () => {
    expect(getVivrTemplate("does_not_exist")).toBeNull();
    expect(getVivrTemplate("emergency_response")).not.toBeNull();
  });
});
