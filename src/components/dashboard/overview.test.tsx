import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import type { DashboardOverview } from "@/server/dashboard/tenant";

import { DashboardOverview as DashboardOverviewView } from "./overview";

function fixture(): DashboardOverview {
  return {
    context: {
      organizationId: "org_test_aaa",
      organizationSlug: "org-a",
      organizationRole: "org:admin",
    },
    organization: {
      id: "org_test_aaa",
      name: "Acme Booking",
      slug: "org-a",
    },
    starNumbers: {
      total: 2000,
      byCategory: { silver: 1200, gold: 500, platinum: 250, diamond: 50 },
    },
  };
}

describe("DashboardOverview", () => {
  it("renders the organization name, slug, role, and total count", () => {
    const html = renderToStaticMarkup(<DashboardOverviewView overview={fixture()} />);

    expect(html).toContain("Acme Booking");
    expect(html).toContain("org-a");
    expect(html).toContain("org:admin");
    expect(html).toContain("Platform inventory");
    expect(html).toContain("2,000");
  });

  it("renders per-category counts", () => {
    const html = renderToStaticMarkup(<DashboardOverviewView overview={fixture()} />);

    expect(html).toContain("Silver");
    expect(html).toContain("1,200");
    expect(html).toContain("Gold");
    expect(html).toContain("500");
    expect(html).toContain("Platinum");
    expect(html).toContain("Diamond");
    expect(html).toContain("50");
  });

  it("links to the platform inventory listing", () => {
    const html = renderToStaticMarkup(<DashboardOverviewView overview={fixture()} />);

    expect(html).toContain('href="/dashboard/star-numbers"');
  });

  it("falls back to the organization slug when the local profile is missing", () => {
    const overview = { ...fixture(), organization: null };
    const html = renderToStaticMarkup(<DashboardOverviewView overview={overview} />);

    expect(html).toContain("org-a");
  });
});