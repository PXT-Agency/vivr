import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Db } from "@/server/db";
import type { OrganizationRow } from "@/server/db/schema";
import type { StarNumberRow } from "@/server/db/schema";

const requireOrganizationRoleMock = vi.hoisted(() => vi.fn());
const createDatabaseMock = vi.hoisted(() => vi.fn());
const createOrganizationRepoMock = vi.hoisted(() => vi.fn());
const createStarRepoMock = vi.hoisted(() => vi.fn());
const endMock = vi.hoisted(() => vi.fn());

const MockAuthContextError = vi.hoisted(() => {
  class MockAuthContextError extends Error {
    readonly code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = "AuthContextError";
      this.code = code;
    }
  }
  return MockAuthContextError;
});

vi.mock("@/server/auth", () => ({
  AuthContextError: MockAuthContextError,
  requireOrganizationRole: requireOrganizationRoleMock,
}));

vi.mock("@/server/db", () => ({
  createDatabase: createDatabaseMock,
}));

vi.mock("@/server/repositories/organizations", () => ({
  createOrganizationRepository: createOrganizationRepoMock,
}));

vi.mock("@/server/repositories/star-numbers", () => ({
  createStarNumberRepository: createStarRepoMock,
}));

import {
  getDashboardOverview,
  getStarNumberListing,
  getTenantContext,
  STAR_LIST_PAGE_SIZE,
  TENANT_VIEWER_ROLES,
} from "./tenant";

const ORG_A = "org_test_aaa";
const ORG_A_SLUG = "org-a";
const ORG_B = "org_test_bbb";
const ORG_B_SLUG = "org-b";
const ROLE = "org:member";

const orgRepoMock = {
  findById: vi.fn(),
  upsert: vi.fn(),
  findBySlug: vi.fn(),
  list: vi.fn(),
  deleteById: vi.fn(),
};

const starRepoMock = {
  list: vi.fn(),
  count: vi.fn(),
  findById: vi.fn(),
  findByNumberCode: vi.fn(),
  findByDisplayNumber: vi.fn(),
  findByCodeOrDisplay: vi.fn(),
  existsByNumberCode: vi.fn(),
  create: vi.fn(),
  createIfAbsent: vi.fn(),
  updateCategory: vi.fn(),
  setStatus: vi.fn(),
};

function organizationContext(orgId: string, slug: string) {
  return {
    userId: "user_test_123",
    sessionId: "sess_test_123",
    organizationId: orgId,
    organizationRole: ROLE,
    organizationSlug: slug,
  } as const;
}

function organizationRow(orgId: string, slug: string): OrganizationRow {
  return {
    id: orgId,
    name: "Test Org",
    slug,
    logo: null,
    metadata: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

function starRow(overrides: Partial<StarNumberRow>): StarNumberRow {
  return {
    id: "star_test_1",
    numberCode: "0001",
    displayNumber: "*0001",
    formatVersion: 1,
    category: "silver",
    status: "available",
    memorabilityScore: null,
    patternTags: [],
    sourceBatchId: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function openDatabaseFixture() {
  createDatabaseMock.mockReturnValue({
    client: { end: endMock },
    db: {} as Db,
  });
  createOrganizationRepoMock.mockReturnValue(orgRepoMock);
  createStarRepoMock.mockReturnValue(starRepoMock);
}

beforeEach(() => {
  requireOrganizationRoleMock.mockReset();
  createDatabaseMock.mockReset();
  createOrganizationRepoMock.mockReset();
  createStarRepoMock.mockReset();
  endMock.mockReset();
  orgRepoMock.findById.mockReset();
  starRepoMock.list.mockReset();
  starRepoMock.count.mockReset();
});

describe("getTenantContext", () => {
  it("returns the server-side organization context when authenticated", async () => {
    requireOrganizationRoleMock.mockResolvedValue(organizationContext(ORG_A, ORG_A_SLUG));

    const context = await getTenantContext();

    expect(context).toEqual({
      organizationId: ORG_A,
      organizationSlug: ORG_A_SLUG,
      organizationRole: ROLE,
    });
    expect(requireOrganizationRoleMock).toHaveBeenCalledWith([...TENANT_VIEWER_ROLES]);
  });

  it("returns null when the user has no active organization", async () => {
    requireOrganizationRoleMock.mockRejectedValue(
      new MockAuthContextError("missing_organization", "No org"),
    );

    expect(await getTenantContext()).toBeNull();
  });

  it("propagates unauthenticated errors", async () => {
    requireOrganizationRoleMock.mockRejectedValue(
      new MockAuthContextError("unauthenticated", "Sign in"),
    );

    await expect(getTenantContext()).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("propagates insufficient-role errors", async () => {
    requireOrganizationRoleMock.mockRejectedValue(
      new MockAuthContextError("insufficient_role", "No access"),
    );

    await expect(getTenantContext()).rejects.toMatchObject({ code: "insufficient_role" });
  });
});

describe("getDashboardOverview", () => {
  it("returns null when no organization is active", async () => {
    requireOrganizationRoleMock.mockRejectedValue(
      new MockAuthContextError("missing_organization", "No org"),
    );

    expect(await getDashboardOverview()).toBeNull();
    expect(createDatabaseMock).not.toHaveBeenCalled();
  });

  it("returns org profile and per-category counts, then closes the client", async () => {
    requireOrganizationRoleMock.mockResolvedValue(organizationContext(ORG_A, ORG_A_SLUG));
    openDatabaseFixture();
    orgRepoMock.findById.mockResolvedValue(organizationRow(ORG_A, ORG_A_SLUG));
    starRepoMock.count.mockImplementation(async (query: { category?: string }) =>
      Promise.resolve({ total: query.category === "diamond" ? 7 : 25, filtered: 25 }),
    );

    const overview = await getDashboardOverview();

    expect(overview).not.toBeNull();
    expect(overview?.organization).toMatchObject({ id: ORG_A, name: "Test Org", slug: ORG_A_SLUG });
    expect(overview?.starNumbers.total).toBe(82);
    expect(overview?.starNumbers.byCategory).toEqual({
      silver: 25,
      gold: 25,
      platinum: 25,
      diamond: 7,
    });
    expect(orgRepoMock.findById).toHaveBeenCalledWith(ORG_A);
    expect(starRepoMock.count).toHaveBeenCalledTimes(4);
    expect(endMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the org profile null when the org is unknown to the local database", async () => {
    requireOrganizationRoleMock.mockResolvedValue(organizationContext(ORG_A, ORG_A_SLUG));
    openDatabaseFixture();
    orgRepoMock.findById.mockResolvedValue(null);
    starRepoMock.count.mockResolvedValue({ total: 0, filtered: 0 });

    const overview = await getDashboardOverview();

    expect(overview?.organization).toBeNull();
    expect(overview?.starNumbers.total).toBe(0);
  });
});

describe("getStarNumberListing", () => {
  function listingFixture() {
    openDatabaseFixture();
    starRepoMock.list.mockResolvedValue([
      starRow({ id: "s1", numberCode: "0001", displayNumber: "*0001", category: "diamond", status: "available" }),
      starRow({ id: "s2", numberCode: "0002", displayNumber: "*0002", category: "diamond", status: "available" }),
    ]);
    starRepoMock.count.mockResolvedValue({ total: 42, filtered: 42 });
  }

  it("returns null when no organization is active", async () => {
    requireOrganizationRoleMock.mockRejectedValue(
      new MockAuthContextError("missing_organization", "No org"),
    );

    expect(await getStarNumberListing()).toBeNull();
    expect(createDatabaseMock).not.toHaveBeenCalled();
  });

  it("lists stars with server-derived filters and pagination", async () => {
    requireOrganizationRoleMock.mockResolvedValue(organizationContext(ORG_A, ORG_A_SLUG));
    listingFixture();

    const listing = await getStarNumberListing({
      search: " 007 ",
      category: "diamond",
      status: "available",
      page: 1,
    });

    expect(starRepoMock.list).toHaveBeenCalledWith({
      search: "007",
      category: "diamond",
      status: "available",
      limit: STAR_LIST_PAGE_SIZE,
      offset: 0,
    });
    expect(starRepoMock.count).toHaveBeenCalledWith({
      search: "007",
      category: "diamond",
      status: "available",
    });
    expect(listing?.stars).toHaveLength(2);
    expect(listing?.stars[0]).toMatchObject({ displayNumber: "*0001", category: "diamond", status: "available" });
    expect(listing?.total).toBe(42);
    expect(listing?.page).toBe(1);
    expect(listing?.totalPages).toBe(2);
    expect(listing?.filters).toEqual({ search: "007", category: "diamond", status: "available" });
    expect(endMock).toHaveBeenCalledTimes(1);
  });

  it("ignores invalid category and status filters", async () => {
    requireOrganizationRoleMock.mockResolvedValue(organizationContext(ORG_A, ORG_A_SLUG));
    listingFixture();

    const listing = await getStarNumberListing({
      search: "0001",
      category: "invalid-category",
      status: "invalid-status",
    });

    expect(starRepoMock.list).toHaveBeenCalledWith({
      search: "0001",
      category: undefined,
      status: undefined,
      limit: STAR_LIST_PAGE_SIZE,
      offset: 0,
    });
    expect(listing?.filters).toEqual({ search: "0001", category: null, status: null });
    expect(listing?.totalPages).toBe(2);
    expect(listing?.page).toBe(1);
  });

  it("clamps an out-of-range page to the last page", async () => {
    requireOrganizationRoleMock.mockResolvedValue(organizationContext(ORG_A, ORG_A_SLUG));
    openDatabaseFixture();
    starRepoMock.list.mockResolvedValue([starRow({ id: "s1", numberCode: "0001" })]);
    starRepoMock.count.mockResolvedValue({ total: 60, filtered: 60 });

    const listing = await getStarNumberListing({ page: 10 });

    expect(listing?.page).toBe(3);
    expect(listing?.totalPages).toBe(Math.ceil(60 / STAR_LIST_PAGE_SIZE));
  });

  it("resolves the tenant boundary from the session, never the client", async () => {
    requireOrganizationRoleMock.mockResolvedValue(organizationContext(ORG_B, ORG_B_SLUG));
    listingFixture();

    const listing = await getStarNumberListing();

    expect(listing?.context.organizationId).toBe(ORG_B);
    expect(listing?.context.organizationSlug).toBe(ORG_B_SLUG);
    // No tenant identifier is injected into the catalog query: the catalog is
    // platform-level today and listing is scoped only by session-derived context.
    expect(starRepoMock.list).toHaveBeenCalledWith({
      search: undefined,
      category: undefined,
      status: undefined,
      limit: STAR_LIST_PAGE_SIZE,
      offset: 0,
    });
  });
});