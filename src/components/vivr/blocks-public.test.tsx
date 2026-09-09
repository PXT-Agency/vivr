import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { buildInitialDraftConfig, parseVivrConfig } from "@/server/services/vivr/schemas";
import type { VivrBlock, VivrConfig } from "@/types/vivr";
import { VivrPublicPage } from "./blocks-public";

function makeConfig(blocks: VivrBlock[]): VivrConfig {
  const base = buildInitialDraftConfig({
    title: "Nakuru County Emergency",
    description: "Official public info",
    brandColor: "#4154a3",
    themeMode: "light",
    logoImageUrl: null,
    coverImageUrl: null,
  });
  return parseVivrConfig({ ...base, blocks });
}

describe("VivrPublicPage", () => {
  it("renders the profile name and description", () => {
    const html = renderToStaticMarkup(<VivrPublicPage config={makeConfig([])} />);
    expect(html).toContain("Nakuru County Emergency");
    expect(html).toContain("Official public info");
  });

  it("renders an empty-state hint when there are no blocks", () => {
    const html = renderToStaticMarkup(<VivrPublicPage config={makeConfig([])} />);
    expect(html).toContain("no blocks yet");
  });

  it("skips disabled blocks and renders actionable links for enabled ones", () => {
    const config = makeConfig([
      {
        id: "b1",
        type: "link",
        enabled: true,
        title: "Open Info Portal",
        config: { url: "https://example.com/info" },
      },
      {
        id: "b2",
        type: "call",
        enabled: true,
        title: "Call the hotline",
        config: { phone: "+254700000000" },
      },
      {
        id: "b3",
        type: "website",
        enabled: false,
        title: "Hidden site",
        config: { url: "https://hidden.example" },
      },
      {
        id: "b4",
        type: "map",
        enabled: true,
        title: "Find us",
        config: { latitude: -1.2833, longitude: 36.8167, query: "Lake Nakuru" },
      },
    ]);
    const html = renderToStaticMarkup(<VivrPublicPage config={config} />);

    expect(html).toContain("Open Info Portal");
    expect(html).toContain("https://example.com/info");
    expect(html).toContain("tel:+254700000000");
    expect(html).toContain("Lake Nakuru");
    expect(html).not.toContain("Hidden site");
    expect(html).not.toContain("no blocks yet");
  });

  it("renders a read-only form block and defers unsupported types", () => {
    const config = makeConfig([
      {
        id: "f1",
        type: "form",
        enabled: true,
        title: "Report an issue",
        config: {
          fields: [{ id: "ff1", label: "Your name", type: "text", required: true }],
          submitAction: { kind: "mailto", email: "a@example.com" },
        },
      },
      {
        id: "w1",
        type: "weather",
        enabled: true,
        title: "Weather",
        config: {},
      },
    ]);
    const html = renderToStaticMarkup(<VivrPublicPage config={config} />);

    expect(html).toContain("Report an issue");
    expect(html).toContain("Your name");
    expect(html).toContain("Submit");
    expect(html).toContain("isn&apos;t available yet");
  });

  it("escapes user-authored strings (no raw HTML injection)", () => {
    const config = makeConfig([
      {
        id: "b1",
        type: "alert",
        enabled: true,
        title: "<img src=x onerror=alert(1)>",
        config: { content: "<b>bold</b> & <script>evil()</script>", severity: "info" },
      },
    ]);
    config.profile.name = "<script>alert('x')</script>";
    const html = renderToStaticMarkup(<VivrPublicPage config={config} />);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<img src=x");
  });
});