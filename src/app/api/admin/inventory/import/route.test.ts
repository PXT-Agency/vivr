import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthContextError, requirePlatformAdminContext } from "@/server/auth";
import { createDatabase } from "@/server/db";
import {
  InventoryImportError,
  runInventoryImport,
} from "@/server/services/inventory/importService";

import { POST } from "./route";

vi.mock("@/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/auth")>();
  return { ...actual, requirePlatformAdminContext: vi.fn() };
});

vi.mock("@/server/db", () => ({
  createDatabase: vi.fn(),
}));

vi.mock("@/server/services/inventory/importService", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/services/inventory/importService")>();
  return { ...actual, runInventoryImport: vi.fn() };
});

const requirePlatformAdminContextMock = vi.mocked(requirePlatformAdminContext);
const createDatabaseMock = vi.mocked(createDatabase);
const runInventoryImportMock = vi.mocked(runInventoryImport);

const ADMIN = {
  userId: "user_admin_1",
  organizationId: "org_test_aaa",
  organizationRole: "org:admin" as const,
  organizationSlug: "org-a",
};

beforeEach(() => {
  requirePlatformAdminContextMock.mockReset();
  createDatabaseMock.mockReset();
  runInventoryImportMock.mockReset();

  createDatabaseMock.mockReturnValue({
    client: { end: vi.fn().mockResolvedValue(undefined) },
    db: {},
  } as unknown as ReturnType<typeof createDatabase>);
});

function request(body: unknown): Request {
  return new Request("http://localhost/api/admin/inventory/import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const resultFixture = {
  batch: {
    id: "batch_1",
    mode: "commit",
    status: "completed",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    completedAt: new Date("2026-01-01T00:00:01Z"),
  } as never,
  summary: {
    accepted: 4,
    rejected: 0,
    duplicate: 0,
    conflict: 0,
    missing: 2,
    missingCodes: ["0003", "0006"],
    total: 4,
    created: 4,
    updated: 0,
    alreadyPresent: 0,
    alreadyProcessed: false,
  } as never,
};

describe("POST /api/admin/inventory/import", () => {
  it("returns 401 when unauthenticated", async () => {
    requirePlatformAdminContextMock.mockRejectedValue(
      new AuthContextError("unauthenticated", "Auth required"),
    );

    const response = await POST(request({ mode: "dry_run" }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "unauthenticated" });
  });

  it("returns 403 for authenticated users without the platform-admin flag", async () => {
    requirePlatformAdminContextMock.mockRejectedValue(
      new AuthContextError("not_platform_admin", "Platform admin required"),
    );

    const response = await POST(request({ mode: "dry_run" }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "not_platform_admin",
    });
  });

  it("returns 400 when the platform admin has no active organization", async () => {
    requirePlatformAdminContextMock.mockRejectedValue(
      new AuthContextError("missing_organization", "Active org required"),
    );

    const response = await POST(request({ mode: "dry_run" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "missing_organization",
    });
  });

  it("returns 400 for an invalid import mode", async () => {
    requirePlatformAdminContextMock.mockResolvedValue(ADMIN);

    const response = await POST(request({ mode: "invalid" }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("invalid_mode");
  });

  it("runs a dry run by default and returns batch + summary", async () => {
    requirePlatformAdminContextMock.mockResolvedValue(ADMIN);
    runInventoryImportMock.mockResolvedValue(resultFixture);

    const response = await POST(request({}));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      batch: {
        id: "batch_1",
        mode: "commit",
        status: "completed",
        createdAt: "2026-01-01T00:00:00.000Z",
        completedAt: "2026-01-01T00:00:01.000Z",
      },
      summary: resultFixture.summary,
    });

    expect(createDatabaseMock).toHaveBeenCalledTimes(1);
    expect(runInventoryImportMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        mode: "dry_run",
        actor: { userId: "user_admin_1", organizationId: "org_test_aaa" },
      }),
    );
  });

  it("propagates expected range and flagged options to the service", async () => {
    requirePlatformAdminContextMock.mockResolvedValue(ADMIN);
    runInventoryImportMock.mockResolvedValue(resultFixture);

    await POST(
      request({
        mode: "commit",
        expectedStart: "0001",
        expectedEnd: "2000",
        allowCategoryUpdate: true,
      }),
    );

    expect(runInventoryImportMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        mode: "commit",
        expectedStart: "0001",
        expectedEnd: "2000",
        allowCategoryUpdate: true,
      }),
    );
  });

  it("maps import service errors to a 400 response without leaking internals", async () => {
    requirePlatformAdminContextMock.mockResolvedValue(ADMIN);
    runInventoryImportMock.mockRejectedValue(
      new InventoryImportError("missing_source_file", "Cannot read source"),
    );

    const response = await POST(request({ mode: "dry_run" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "missing_source_file",
      message: "Cannot read source",
    });
  });

  it("resolves the actor server-side from the session, never the body", async () => {
    requirePlatformAdminContextMock.mockResolvedValue(ADMIN);
    runInventoryImportMock.mockResolvedValue(resultFixture);

    await POST(request({ mode: "dry_run" }));

    expect(runInventoryImportMock).toHaveBeenCalledTimes(1);
    const call = runInventoryImportMock.mock.calls[0];
    expect(call?.[1]?.actor).toEqual({
      userId: "user_admin_1",
      organizationId: "org_test_aaa",
    });
  });
});