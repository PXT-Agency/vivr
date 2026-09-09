import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import type { AdminImportBatchView } from "@/server/dashboard/admin";

import { ImportBatchesTable } from "./batch-list";

function batch(overrides: Partial<AdminImportBatchView> = {}): AdminImportBatchView {
  return {
    id: "batch_test_1",
    sourceName: "star-inventory-part-01-2.md, star-inventory-part-02.csv",
    mode: "dry_run",
    status: "completed",
    summary: {
      accepted: 1999,
      rejected: 0,
      duplicate: 0,
      conflict: 0,
      missing: 1,
      total: 1999,
      created: 0,
      updated: 0,
      alreadyPresent: 0,
      alreadyProcessed: false,
      missingCodes: [],
    },
    startedAt: new Date("2026-01-02T10:00:00.000Z"),
    completedAt: new Date("2026-01-02T10:01:00.000Z"),
    createdAt: new Date("2026-01-02T10:00:00.000Z"),
    ...overrides,
  };
}

describe("ImportBatchesTable", () => {
  it("renders batch source, mode, status, and outcome counts", () => {
    const html = renderToStaticMarkup(<ImportBatchesTable batches={[batch()]} />);

    expect(html).toContain("Import batches");
    expect(html).toContain("star-inventory-part-01-2.md");
    expect(html).toContain("Dry run");
    expect(html).toContain("Completed");
    expect(html).toContain("1,999");
    expect(html).toContain("1,999");
  });

  it("links each batch to its detail page", () => {
    const html = renderToStaticMarkup(<ImportBatchesTable batches={[batch()]} />);

    expect(html).toContain('href="/admin/inventory/imports/batch_test_1"');
  });

  it("renders the empty state when no batches exist", () => {
    const html = renderToStaticMarkup(<ImportBatchesTable batches={[]} />);

    expect(html).toContain("No import batches recorded yet.");
  });

  it("renders aggregate summary chips across batches", () => {
    const html = renderToStaticMarkup(<ImportBatchesTable batches={[batch(), batch()]} />);

    expect(html).toContain("Total rows");
    expect(html).toContain("3,998");
  });
});