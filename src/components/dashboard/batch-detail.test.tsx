import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import type { AdminImportBatchDetail } from "@/server/dashboard/admin";

import { ImportBatchDetail } from "./batch-detail";

function fixture(): AdminImportBatchDetail {
  return {
    batch: {
      id: "batch_test_1",
      sourceName: "star-inventory-part-01-2.md, star-inventory-part-02.csv",
      mode: "commit",
      status: "completed",
      summary: {
        accepted: 1999,
        rejected: 0,
        duplicate: 0,
        conflict: 1,
        missing: 1,
        total: 2001,
        created: 1900,
        updated: 99,
        alreadyPresent: 0,
        alreadyProcessed: false,
        missingCodes: ["1234"],
      },
      startedAt: new Date("2026-01-02T10:00:00.000Z"),
      completedAt: new Date("2026-01-02T10:01:00.000Z"),
      createdAt: new Date("2026-01-02T10:00:00.000Z"),
    },
    rows: [
      {
        lineNumber: 1,
        sourceFile: "star-inventory-part-01-2.md",
        number: "*0001",
        category: "silver",
        status: "available",
        result: "accepted",
        errorCode: null,
        errorMessage: null,
        action: "created",
      },
      {
        lineNumber: 4101,
        sourceFile: "star-inventory-part-02.csv",
        number: "*0010",
        category: null,
        status: null,
        result: "conflict",
        errorCode: "status_downgrade_protected",
        errorMessage:
          "Existing record 0010 is sold; a stale source value available must not downgrade it. Shipments already allocated to this number must be resolved through the lifecycle service before the catalog can be updated.",
        action: null,
      },
    ],
  };
}

describe("ImportBatchDetail", () => {
  it("renders batch header fields with mode and status badges", () => {
    const html = renderToStaticMarkup(<ImportBatchDetail detail={fixture()} />);

    expect(html).toContain("star-inventory-part-01-2.md, star-inventory-part-02.csv");
    expect(html).toContain("Commit");
    expect(html).toContain("Completed");
    expect(html).toContain("Started");
  });

  it("renders summary statistics", () => {
    const html = renderToStaticMarkup(<ImportBatchDetail detail={fixture()} />);

    expect(html).toContain("Total rows");
    expect(html).toContain("2,001");
    expect(html).toContain("Created");
    expect(html).toContain("1,900");
    expect(html).toContain("Updated");
    expect(html).toContain("99");
    expect(html).toContain("Conflicts");
  });

  it("renders structured row outcomes without leaking raw JSON", () => {
    const html = renderToStaticMarkup(<ImportBatchDetail detail={fixture()} />);

    expect(html).toContain("*0001");
    expect(html).toContain("Silver");
    expect(html).toContain("Accepted");
    expect(html).toContain("Created");
    expect(html).toContain("*0010");
    expect(html).toContain("Conflict");
    expect(html).toContain("Existing record 0010 is sold");
    // The raw error code and JSON blobs are never rendered.
    expect(html).not.toContain('"rawValueJson"');
    expect(html).not.toContain("putCells");
  });

  it("truncates long error messages and keeps the full text in the title attribute", () => {
    const html = renderToStaticMarkup(<ImportBatchDetail detail={fixture()} />);

    expect(html).toContain("…");
    expect(html).toContain('title="Existing record 0010 is sold; a stale source value');
    expect(html).toContain('…</span>');
  });

  it("renders the empty rows state", () => {
    const detail = { ...fixture(), rows: [] };
    const html = renderToStaticMarkup(<ImportBatchDetail detail={detail} />);

    expect(html).toContain("No row records stored for this batch.");
  });

  it("links back to the import batches list", () => {
    const html = renderToStaticMarkup(<ImportBatchDetail detail={fixture()} />);

    expect(html).toContain('href="/admin/inventory/imports"');
  });
});