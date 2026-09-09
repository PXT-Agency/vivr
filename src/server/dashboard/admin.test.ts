import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Db } from "@/server/db";
import type { InventoryImportBatchRow, InventoryImportRowRow } from "@/server/db/schema";

const requirePlatformAdminContextMock = vi.hoisted(() => vi.fn());
const createDatabaseMock = vi.hoisted(() => vi.fn());
const createImportsRepoMock = vi.hoisted(() => vi.fn());
const notFoundMock = vi.hoisted(() => vi.fn());
const endMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/auth", () => ({
  requirePlatformAdminContext: requirePlatformAdminContextMock,
}));

vi.mock("@/server/db", () => ({
  createDatabase: createDatabaseMock,
}));

vi.mock("@/server/repositories/inventory-imports", () => ({
  createInventoryImportRepository: createImportsRepoMock,
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

import { getImportBatch, getImportBatches, ADMIN_BATCHES_PAGE_SIZE } from "./admin";

const importsRepoMock = {
  createBatch: vi.fn(),
  findBatchById: vi.fn(),
  findBySourceHash: vi.fn(),
  updateBatchStatus: vi.fn(),
  setBatchSummary: vi.fn(),
  writeRows: vi.fn(),
  findRowsByBatch: vi.fn(),
  findRowByBatchAndLine: vi.fn(),
  countRowsByBatch: vi.fn(),
  listBatches: vi.fn(),
};

function batchRow(overrides: Partial<InventoryImportBatchRow> = {}): InventoryImportBatchRow {
  return {
    id: "batch_test_1",
    sourceName: "star-inventory-part-01-2.md, star-inventory-part-02.csv",
    sourceHash: "hash",
    mode: "dry_run",
    status: "completed",
    summaryJson: {
      accepted: 1999,
      rejected: 0,
      duplicate: 0,
      missing: 1,
      conflict: 0,
      total: 1999,
      created: 0,
      updated: 0,
      alreadyPresent: 0,
      alreadyProcessed: false,
    },
    actorId: "actor_test_1",
    startedAt: new Date("2026-01-02T10:00:00.000Z"),
    completedAt: new Date("2026-01-02T10:01:00.000Z"),
    createdAt: new Date("2026-01-02T10:00:00.000Z"),
    updatedAt: new Date("2026-01-02T10:01:00.000Z"),
    ...overrides,
  };
}

function rowRecord(overrides: Partial<InventoryImportRowRow> = {}): InventoryImportRowRow {
  return {
    id: "row_test_1",
    batchId: "batch_test_1",
    lineNumber: 1,
    rawValueJson: {
      sourceFile: "star-inventory-part-01-2.md",
      lineNumber: 1,
      source: "| *0001 | Available | silver |",
      cells: ["*0001", "available", "silver"],
    },
    normalizedValueJson: {
      numberCode: "0001",
      displayNumber: "*0001",
      category: "silver",
      status: "available",
      action: "created",
    },
    result: "accepted",
    errorCode: null,
    errorMessage: null,
    createdAt: new Date("2026-01-02T10:00:00.000Z"),
    ...overrides,
  };
}

function adminContext() {
  return {
    userId: "user_test_123",
    organizationId: "org_test_aaa",
    organizationRole: "org:admin",
    organizationSlug: "org-a",
  };
}

function openDatabaseFixture() {
  createDatabaseMock.mockReturnValue({
    client: { end: endMock },
    db: {} as Db,
  });
  createImportsRepoMock.mockReturnValue(importsRepoMock);
}

beforeEach(() => {
  requirePlatformAdminContextMock.mockReset();
  createDatabaseMock.mockReset();
  createImportsRepoMock.mockReset();
  notFoundMock.mockReset();
  endMock.mockReset();
  importsRepoMock.listBatches.mockReset();
  importsRepoMock.findBatchById.mockReset();
  importsRepoMock.findRowsByBatch.mockReset();
});

describe("getImportBatches", () => {
  it("requires the platform-admin context", async () => {
    requirePlatformAdminContextMock.mockRejectedValue(
      new Error("not_platform_admin"),
    );

    await expect(getImportBatches()).rejects.toThrow("not_platform_admin");
    expect(createDatabaseMock).not.toHaveBeenCalled();
  });

  it("lists batches with parsed summaries and closes the client", async () => {
    requirePlatformAdminContextMock.mockResolvedValue(adminContext());
    openDatabaseFixture();
    importsRepoMock.listBatches.mockResolvedValue([batchRow()]);

    const batches = await getImportBatches();

    expect(requirePlatformAdminContextMock).toHaveBeenCalledTimes(1);
    expect(importsRepoMock.listBatches).toHaveBeenCalledWith(ADMIN_BATCHES_PAGE_SIZE);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toMatchObject({
      id: "batch_test_1",
      mode: "dry_run",
      status: "completed",
      sourceName: "star-inventory-part-01-2.md, star-inventory-part-02.csv",
      completedAt: new Date("2026-01-02T10:01:00.000Z"),
    });
    expect(batches[0]?.summary).toMatchObject({
      accepted: 1999,
      rejected: 0,
      conflict: 0,
      missing: 1,
    });
    expect(endMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to a zeroed summary when stored JSON is malformed", async () => {
    requirePlatformAdminContextMock.mockResolvedValue(adminContext());
    openDatabaseFixture();
    importsRepoMock.listBatches.mockResolvedValue([
      batchRow({ summaryJson: { unexpected: true } }),
    ]);

    const batches = await getImportBatches();

    expect(batches[0]?.summary.total).toBe(0);
    expect(batches[0]?.summary.alreadyProcessed).toBe(false);
  });
});

describe("getImportBatch", () => {
  it("requires the platform-admin context before touching the database", async () => {
    requirePlatformAdminContextMock.mockRejectedValue(
      new Error("unauthenticated"),
    );

    await expect(getImportBatch("batch_test_1")).rejects.toThrow("unauthenticated");
    expect(createDatabaseMock).not.toHaveBeenCalled();
  });

  it("returns a structured batch detail with derived row fields, never raw JSON", async () => {
    requirePlatformAdminContextMock.mockResolvedValue(adminContext());
    openDatabaseFixture();
    importsRepoMock.findBatchById.mockResolvedValue(batchRow());
    importsRepoMock.findRowsByBatch.mockResolvedValue([
      rowRecord(),
      rowRecord({
        id: "row_test_2",
        lineNumber: 2,
        rawValueJson: {
          sourceFile: "star-inventory-part-01-2.md",
          lineNumber: 2,
          source: "| 0002 | Reserved | gold |",
          cells: ["0002", "reserved", "gold"],
        },
        normalizedValueJson: null,
        result: "rejected",
        errorCode: "unexpected_columns",
        errorMessage: "Line 2: invalid values.",
      }),
      rowRecord({
        id: "row_test_3",
        lineNumber: 3,
        rawValueJson: {
          sourceFile: "star-inventory-part-01-2.md",
          lineNumber: 3,
          source: "| *0010 | Available | platinum |",
          cells: ["*0010", "available", "platinum"],
        },
        normalizedValueJson: {
          numberCode: "0010",
          displayNumber: "*0010",
          category: "platinum",
          status: "available",
          action: null,
        },
        result: "conflict",
        errorCode: "status_downgrade_protected",
        errorMessage: "Existing record 0010 is sold; a stale source value must not downgrade it.",
      }),
    ]);

    const detail = await getImportBatch("batch_test_1");

    expect(importsRepoMock.findBatchById).toHaveBeenCalledWith("batch_test_1");
    expect(importsRepoMock.findRowsByBatch).toHaveBeenCalledWith("batch_test_1");
    expect(detail.batch.mode).toBe("dry_run");
    expect(detail.batch.status).toBe("completed");
    expect(detail.rows).toHaveLength(3);

    expect(detail.rows[0]).toMatchObject({
      lineNumber: 1,
      number: "*0001",
      category: "silver",
      status: "available",
      result: "accepted",
      errorMessage: null,
      action: "created",
    });
    expect(detail.rows[1]).toMatchObject({
      lineNumber: 2,
      number: "0002",
      category: "gold",
      status: "reserved",
      result: "rejected",
      errorCode: "unexpected_columns",
    });
    expect(detail.rows[2]).toMatchObject({
      lineNumber: 3,
      number: "*0010",
      category: "platinum",
      status: "available",
      result: "conflict",
      errorCode: "status_downgrade_protected",
      action: null,
    });
    expect(endMock).toHaveBeenCalledTimes(1);
  });

  it("calls notFound when the batch does not exist", async () => {
    requirePlatformAdminContextMock.mockResolvedValue(adminContext());
    openDatabaseFixture();
    importsRepoMock.findBatchById.mockResolvedValue(null);

    notFoundMock.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    await expect(getImportBatch("missing")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
    expect(endMock).toHaveBeenCalledTimes(1);
  });
});