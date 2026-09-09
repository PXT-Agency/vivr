import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthContextError, requirePlatformAdminContext } from "@/server/auth";
import { createDatabase } from "@/server/db";
import { createInventoryImportRepository } from "@/server/repositories/inventory-imports";

import { GET } from "./route";

vi.mock("@/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/auth")>();
  return { ...actual, requirePlatformAdminContext: vi.fn() };
});

vi.mock("@/server/db", () => ({
  createDatabase: vi.fn(),
}));

vi.mock("@/server/repositories/inventory-imports", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/repositories/inventory-imports")>();
  return { ...actual, createInventoryImportRepository: vi.fn() };
});

const requirePlatformAdminContextMock = vi.mocked(requirePlatformAdminContext);
const createDatabaseMock = vi.mocked(createDatabase);
const createInventoryImportRepositoryMock = vi.mocked(createInventoryImportRepository);

beforeEach(() => {
  requirePlatformAdminContextMock.mockReset();
  createDatabaseMock.mockReset();
  createInventoryImportRepositoryMock.mockReset();

  createDatabaseMock.mockReturnValue({
    client: { end: vi.fn().mockResolvedValue(undefined) },
    db: {},
  } as unknown as ReturnType<typeof createDatabase>);
});

const BATCH_ID = "11111111-1111-1111-1111-111111111111";

const batchFixture = {
  id: BATCH_ID,
  mode: "commit",
  status: "completed",
  sourceName: "star-inventory-part-01-2.md, star-inventory-part-02.csv",
  sourceHash: "abc123",
  startedAt: new Date("2026-01-02T00:00:00Z"),
  completedAt: new Date("2026-01-02T00:00:01Z"),
  createdAt: new Date("2026-01-02T00:00:00Z"),
  actorId: "actor_1",
  summaryJson: { accepted: 4, missing: 2, missingCodes: ["0003", "0006"] },
};

const rowsFixture = [
  {
    id: "row_1",
    lineNumber: 3,
    rawValueJson: { source: "| *0001 | Available | Silver |", cells: ["*0001", "Available", "Silver"] },
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
  },
];

describe("GET /api/admin/inventory/imports/[batchId]", () => {
  it("returns 401 when unauthenticated", async () => {
    requirePlatformAdminContextMock.mockRejectedValue(
      new AuthContextError("unauthenticated", "Auth required"),
    );

    const response = await GET(new Request("http://localhost/x"), {
      params: Promise.resolve({ batchId: BATCH_ID }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 403 for a non-platform-admin user", async () => {
    requirePlatformAdminContextMock.mockRejectedValue(
      new AuthContextError("not_platform_admin", "Platform admin required"),
    );

    const response = await GET(new Request("http://localhost/x"), {
      params: Promise.resolve({ batchId: BATCH_ID }),
    });

    expect(response.status).toBe(403);
  });

  it("rejects malformed batch ids", async () => {
    requirePlatformAdminContextMock.mockResolvedValue({
      userId: "user_admin_1",
      organizationId: "org_test_aaa",
      organizationRole: "org:admin",
      organizationSlug: "org-a",
    });

    const response = await GET(new Request("http://localhost/x"), {
      params: Promise.resolve({ batchId: "../../etc/passwd" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 404 when the batch does not exist", async () => {
    requirePlatformAdminContextMock.mockResolvedValue({
      userId: "user_admin_1",
      organizationId: "org_test_aaa",
      organizationRole: "org:admin",
      organizationSlug: "org-a",
    });
    createInventoryImportRepositoryMock.mockReturnValue({
      findBatchById: vi.fn().mockResolvedValue(null),
    } as never);

    const response = await GET(new Request("http://localhost/x"), {
      params: Promise.resolve({ batchId: BATCH_ID }),
    });

    expect(response.status).toBe(404);
  });

  it("returns the batch with its row-level outcomes", async () => {
    requirePlatformAdminContextMock.mockResolvedValue({
      userId: "user_admin_1",
      organizationId: "org_test_aaa",
      organizationRole: "org:admin",
      organizationSlug: "org-a",
    });
    createInventoryImportRepositoryMock.mockReturnValue({
      findBatchById: vi.fn().mockResolvedValue(batchFixture),
      findRowsByBatch: vi.fn().mockResolvedValue(rowsFixture),
    } as never);

    const response = await GET(new Request("http://localhost/x"), {
      params: Promise.resolve({ batchId: BATCH_ID }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.batch.id).toBe(BATCH_ID);
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0]).toMatchObject({
      lineNumber: 3,
      result: "accepted",
      normalizedValue: { numberCode: "0001", displayNumber: "*0001" },
    });
  });
});