import { describe, expect, it } from "vitest";

import type { VivrBlockType } from "@/config/vivr";
import { buildInitialDraftConfig, parseVivrBlock, parseVivrConfig, rebaseDraftConfig } from "@/server/services/vivr/schemas";

function validLinkBlock(overrides: Record<string, unknown> = {}) {
  return {
    id: "block_link",
    type: "link",
    enabled: true,
    title: "Call the hotline",
    config: { url: "https://example.com/hotline" },
    ...overrides,
  };
}

describe("parseVivrBlock", () => {
  it("accepts every supported block type with a valid config", () => {
    const cases: Array<{ type: VivrBlockType; config: Record<string, unknown> }> = [
      { type: "link", config: { url: "https://example.com" } },
      { type: "call", config: { phone: "+254700000000" } },
      { type: "whatsapp", config: { phone: "+254700000000", message: "Help" } },
      { type: "sms", config: { phone: "+254700000000" } },
      { type: "website", config: { url: "https://example.com" } },
      { type: "map", config: { latitude: -1.2833, longitude: 36.8167 } },
      { type: "file", config: { url: "https://example.com/a.pdf", fileName: "Notice" } },
      {
        type: "alert",
        config: { content: "Storm coming", severity: "warning" },
      },
      {
        type: "social",
        config: { links: [{ platform: "facebook", url: "https://facebook.com/you" }] },
      },
      {
        type: "form",
        config: {
          fields: [{ id: "f1", label: "Name", type: "text", required: true }],
          submitAction: { kind: "mailto", email: "a@example.com" },
        },
      },
    ];

    for (const { type, config } of cases) {
      const parsed = parseVivrBlock({
        id: "block_id",
        type,
        enabled: true,
        title: "Block",
        config,
      });
      expect(() => parseVivrConfig({ ...initial(), blocks: [parsed] })).not.toThrow();
    }
  });

  it("rejects unknown block types", () => {
    expect(() =>
      parseVivrBlock({ id: "x", type: "ticker", enabled: true, title: "T", config: {} }),
    ).toThrow();
  });

  it("rejects invalid config values per type", () => {
    expect(() =>
      parseVivrBlock({
        id: "x",
        type: "link",
        enabled: true,
        title: "T",
        config: { url: "not-a-url" },
      }),
    ).toThrow();

    expect(() =>
      parseVivrBlock({
        id: "x",
        type: "map",
        enabled: true,
        title: "T",
        config: { latitude: 45, longitude: 200 },
      }),
    ).toThrow(/longitude/i);

    expect(() =>
      parseVivrBlock({
        id: "x",
        type: "alert",
        enabled: true,
        title: "T",
        config: { content: "X", severity: "catastrophic" },
      }),
    ).toThrow();

    expect(() =>
      parseVivrBlock({
        id: "x",
        type: "social",
        enabled: true,
        title: "T",
        config: { links: [{ platform: "linkedin-prime", url: "https://x.com" }] },
      }),
    ).toThrow();

    expect(() =>
      parseVivrBlock({
        id: "x",
        type: "form",
        enabled: true,
        title: "T",
        config: {
          fields: [{ id: "f1", label: "", type: "text", required: true }],
          submitAction: { kind: "mailto", email: "not-an-email" },
        },
      }),
    ).toThrow();
  });

  it("accepts deferred (not yet available) block types structurally", () => {
    const parsed = parseVivrBlock({
      id: "x",
      type: "weather",
      enabled: true,
      title: "Weather",
      config: { anything: "future" },
    });
    expect(parsed.type).toBe("weather");
  });
});

describe("parseVivrConfig", () => {
  it("accepts an empty config", () => {
    expect(() => parseVivrConfig(initial())).not.toThrow();
  });

  it("rejects configs with duplicate block ids", () => {
    const config = initial();
    config.blocks = [validLinkBlock(), validLinkBlock()];
    expect(() => parseVivrConfig(config)).toThrow(/duplicate/i);
  });
});

describe("rebaseDraftConfig", () => {
  it("keeps block ids and order while rebasing profile and theme", () => {
    const config = parseVivrConfig({
      ...initial(),
      blocks: [validLinkBlock({ id: "a" }), validLinkBlock({ id: "b" })],
    });
    const rebased = rebaseDraftConfig(config, {
      title: "New title",
      description: "New description",
      brandColor: "#ff0000",
      themeMode: "dark",
      logoImageUrl: null,
      coverImageUrl: null,
    });

    expect(rebased.blocks.map((block) => block.id)).toEqual(["a", "b"]);
    expect(rebased.profile.name).toBe("New title");
    expect(rebased.theme.primary).toBe("#ff0000");
    expect(rebased.theme.mode).toBe("dark");
  });
});

describe("buildInitialDraftConfig", () => {
  it("builds an empty, structurally valid config", () => {
    const config = buildInitialDraftConfig({
      title: "My VIVR",
      description: "desc",
      brandColor: "#4154a3",
      themeMode: "light",
      logoImageUrl: null,
      coverImageUrl: null,
    });
    expect(() => parseVivrConfig(config)).not.toThrow();
    expect(config.schemaVersion).toBe(1);
    expect(config.blocks).toEqual([]);
    expect(config.profile.name).toBe("My VIVR");
  });
});

function initial(): ReturnType<typeof buildInitialDraftConfig> {
  return buildInitialDraftConfig({
    title: "Test",
    description: "",
    brandColor: "#4154a3",
    themeMode: "light",
    logoImageUrl: null,
    coverImageUrl: null,
  });
}