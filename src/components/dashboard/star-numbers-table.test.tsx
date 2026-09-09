import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import type { StarNumberListing } from "@/server/dashboard/tenant";

import { StarNumbersTable } from "./star-numbers-table";

function fixture(overrides: Partial<StarNumberListing> = {}): StarNumberListing {
  return {
    context: {
      organizationId: "org_test_aaa",
      organizationSlug: "org-a",
      organizationRole: "org:member",
    },
    stars: [
      {
        id: "s1",
        displayNumber: "*0001",
        numberCode: "0001",
        category: "diamond",
        status: "available",
      },
      {
        id: "s2",
        displayNumber: "*0002",
        numberCode: "0002",
        category: "gold",
        status: "sold",
      },
    ],
    total: 42,
    page: 1,
    pageSize: 25,
    totalPages: 2,
    filters: { search: "007", category: "diamond", status: "available" },
    ...overrides,
  };
}

describe("StarNumbersTable", () => {
  it("renders rows with display number, category, and status badges", () => {
    const html = renderToStaticMarkup(<StarNumbersTable listing={fixture()} />);

    expect(html).toContain("*0001");
    expect(html).toContain("Diamond");
    expect(html).toContain("Available");
    expect(html).toContain("*0002");
    expect(html).toContain("Gold");
    expect(html).toContain("Sold");
  });

  it("renders the tenant context and inventory totals", () => {
    const html = renderToStaticMarkup(<StarNumbersTable listing={fixture()} />);

    expect(html).toContain("Platform inventory");
    expect(html).toContain("org-a");
    expect(html).toContain("Showing 1–25 of 42 star numbers.");
  });

  it("renders the empty state when no rows match", () => {
    const html = renderToStaticMarkup(
      <StarNumbersTable listing={fixture({ stars: [], total: 0, totalPages: 1 })} />,
    );

    expect(html).toContain("No star numbers to display.");
    expect(html).toContain("No star numbers match the current filters.");
  });

  it("preserves filters in pagination links", () => {
    const html = renderToStaticMarkup(<StarNumbersTable listing={fixture()} />);

    expect(html).toContain('href="/dashboard/star-numbers?q=007');
    expect(html).toContain("category=diamond");
    expect(html).toContain("status=available");
    expect(html).toContain("page=2");
  });

  it("disables pagination on a single-page listing", () => {
    const html = renderToStaticMarkup(
      <StarNumbersTable listing={fixture({ totalPages: 1 })} />,
    );

    expect(html).not.toContain("page=2");
  });

  it("renders invalid category filter labels as titles", () => {
    const html = renderToStaticMarkup(<StarNumbersTable listing={fixture()} />);

    expect(html).toContain("All categories");
  });
});