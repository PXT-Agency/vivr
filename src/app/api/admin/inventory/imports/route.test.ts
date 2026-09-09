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

const batchFixture = [
  {
    id: "batch_2",
    mode: "dry_run",
    status: "completed",
    sourceName: "star-inventory-part-01-2.md",
    startedAt: new Date("2026-01-02T00:00:00Z"),
    completedAt: new Date("2026-01-02T00:00:01Z"),
    createdAt: new Date("2026-01-02T00:00:00Z"),
    actorId: "actor_1",
    summaryJson: { accepted: 4, rejected: 0, conflict: 0, missing: 2 },
  },
];

describe("GET /api/admin/inventory/imports", () => {
  it("returns 401 when unauthenticated", async () => {
    requirePlatformAdminContextMock.mockRejectedValue(
      new AuthContextError("unauthenticated", "Auth required"),
    );

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("returns 403 for a non-platform-admin user", async () => {
    requirePlatformAdminContextMock.mockRejectedValue(
      new AuthContextError("not_platform_admin", "Platform admin required"),
    );

    const response = await GET();

    expect(response.status).toBe(403);
  });

  it("lists recent batches most recent first", async () => {
    requirePlatformAdminContextMock.mockResolvedValue({
      userId: "user_admin_1",
      organizationId: "org_test_aaa",
      organizationRole: "org:admin",
      organizationSlug: "org-a",
    });
    createInventoryImportRepositoryMock.mockReturnValue({
      listBatches: vi.fn().mockResolvedValue(batchFixture),
    } as never);

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.batches).toHaveLength(1);
    expect(body.batches[0]).toMatchObject({
      id: "batch_2",
      mode: "dry_run",
      status: "completed",
      summary: { accepted: 4, conflict: 0, missing: 2 },
    });
  });
});