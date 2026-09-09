import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AuthContextError,
  getAuthContext,
  getCurrentActor,
  isCurrentUserPlatformAdmin,
  requireAuth,
  requireOrganization,
  requireOrganizationRole,
  requirePlatformAdmin,
  requirePlatformAdminContext,
} from "./index";

const getSessionMock = vi.hoisted(() => vi.fn());
const createDatabaseMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  getAuth: () => ({
    api: {
      getSession: getSessionMock,
    },
  }),
}));

vi.mock("@/server/db", () => ({
  createDatabase: createDatabaseMock,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

function mockDbSelect(rows: unknown[]) {
  const limitMock = vi.fn().mockResolvedValue(rows);
  const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
  const innerJoinMock = vi.fn().mockReturnValue({ where: whereMock });
  const fromMock = vi.fn().mockReturnValue({ innerJoin: innerJoinMock });
  const selectMock = vi.fn().mockReturnValue({ from: fromMock });
  const endMock = vi.fn().mockResolvedValue(undefined);

  createDatabaseMock.mockReturnValue({
    client: { end: endMock },
    db: { select: selectMock },
  });

  return { selectMock, endMock };
}

function mockSession(
  overrides: {
    session?: Record<string, unknown> | null;
    user?: Record<string, unknown>;
    membershipRows?: unknown[];
  } = {},
) {
  const user = overrides.user ?? { id: "user_test", email: "test@example.com", name: "Test User", platformRole: "user" };

  if (overrides.session === null) {
    getSessionMock.mockResolvedValue(null);
  } else {
    const session = overrides.session ?? { id: "sess_test", activeOrganizationId: null };
    getSessionMock.mockResolvedValue({ session, user });

    if (session.activeOrganizationId && overrides.membershipRows !== undefined) {
      mockDbSelect(overrides.membershipRows);
    } else if (!session.activeOrganizationId) {
      mockDbSelect([]);
    }
  }
}

const USER_ID = "user_test_123";
const ORG_A = "org_test_aaa";
const SESSION_ID = "sess_test_123";

beforeEach(() => {
  getSessionMock.mockReset();
  createDatabaseMock.mockReset();
});

describe("getAuthContext", () => {
  it("returns null for unauthenticated requests", async () => {
    mockSession({ session: null });

    expect(await getAuthContext()).toBeNull();
  });

  it("returns user and organization context when authenticated with an active organization", async () => {
    mockSession({
      session: { id: SESSION_ID, activeOrganizationId: ORG_A },
      user: { id: USER_ID, email: "jane@example.com", name: "Jane", platformRole: "user" },
      membershipRows: [
        {
          organizationId: ORG_A,
          organizationSlug: "org-a",
          role: "org:admin",
          memberId: "mem_1",
        },
      ],
    });

    const context = await getAuthContext();

    expect(context).not.toBeNull();
    expect(context?.userId).toBe(USER_ID);
    expect(context?.organizationId).toBe(ORG_A);
    expect(context?.organizationRole).toBe("org:admin");
    expect(context?.organizationSlug).toBe("org-a");
  });

  it("keeps organization fields null when no organization is active", async () => {
    mockSession({
      session: { id: SESSION_ID, activeOrganizationId: null },
      user: { id: USER_ID, email: "jane@example.com", name: "Jane", platformRole: "user" },
    });

    const context = await getAuthContext();

    expect(context?.userId).toBe(USER_ID);
    expect(context?.organizationId).toBeNull();
    expect(context?.organizationRole).toBeNull();
  });

  it("ignores non-application organization roles", async () => {
    mockSession({
      session: { id: SESSION_ID, activeOrganizationId: ORG_A },
      user: { id: USER_ID, email: "jane@example.com", name: "Jane", platformRole: "user" },
      membershipRows: [
        {
          organizationId: ORG_A,
          organizationSlug: "org-a",
          role: "org:basic",
          memberId: "mem_1",
        },
      ],
    });

    const context = await getAuthContext();

    expect(context?.organizationId).toBe(ORG_A);
    expect(context?.organizationRole).toBeNull();
  });

  it("sets null org when session has activeOrganizationId but no membership row", async () => {
    mockSession({
      session: { id: SESSION_ID, activeOrganizationId: ORG_A },
      user: { id: USER_ID, email: "jane@example.com", name: "Jane", platformRole: "user" },
      membershipRows: [],
    });

    const context = await getAuthContext();

    expect(context?.userId).toBe(USER_ID);
    expect(context?.organizationId).toBeNull();
    expect(context?.organizationRole).toBeNull();
  });

  it("reads platformRole from the user object", async () => {
    mockSession({
      session: { id: SESSION_ID, activeOrganizationId: null },
      user: { id: USER_ID, email: "admin@example.com", name: "Admin", platformRole: "platform_admin" },
    });

    const context = await getAuthContext();

    expect(context?.platformRole).toBe("platform_admin");
  });

  it("defaults platformRole to user when value is unrecognized", async () => {
    mockSession({
      session: { id: SESSION_ID, activeOrganizationId: null },
      user: { id: USER_ID, email: "x@example.com", name: "X", platformRole: "unknown_role" },
    });

    const context = await getAuthContext();

    expect(context?.platformRole).toBe("user");
  });
});

describe("requireAuth", () => {
  it("rejects unauthenticated requests", async () => {
    mockSession({ session: null });

    await expect(requireAuth()).rejects.toMatchObject({
      name: "AuthContextError",
      code: "unauthenticated",
    });
  });

  it("returns the auth context when authenticated", async () => {
    mockSession({
      session: { id: SESSION_ID, activeOrganizationId: ORG_A },
      user: { id: USER_ID, email: "jane@example.com", name: "Jane", platformRole: "user" },
      membershipRows: [
        { organizationId: ORG_A, organizationSlug: "org-a", role: "org:member", memberId: "mem_1" },
      ],
    });

    const context = await requireAuth();

    expect(context.userId).toBe(USER_ID);
    expect(context.organizationId).toBe(ORG_A);
  });
});

describe("requireOrganization", () => {
  it("rejects unauthenticated requests", async () => {
    mockSession({ session: null });

    await expect(requireOrganization()).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("rejects authenticated requests without an active organization", async () => {
    mockSession({
      session: { id: SESSION_ID, activeOrganizationId: null },
      user: { id: USER_ID, email: "jane@example.com", name: "Jane", platformRole: "user" },
    });

    await expect(requireOrganization()).rejects.toMatchObject({
      code: "missing_organization",
    });
  });

  it("rejects when the active organization has no usable role", async () => {
    mockSession({
      session: { id: SESSION_ID, activeOrganizationId: ORG_A },
      user: { id: USER_ID, email: "jane@example.com", name: "Jane", platformRole: "user" },
      membershipRows: [
        { organizationId: ORG_A, organizationSlug: "org-a", role: "org:unknown", memberId: "mem_1" },
      ],
    });

    await expect(requireOrganization()).rejects.toMatchObject({
      code: "missing_organization",
    });
  });

  it("returns a typed organization id when an organization is active", async () => {
    mockSession({
      session: { id: SESSION_ID, activeOrganizationId: ORG_A },
      user: { id: USER_ID, email: "jane@example.com", name: "Jane", platformRole: "user" },
      membershipRows: [
        { organizationId: ORG_A, organizationSlug: "org-a", role: "org:editor", memberId: "mem_1" },
      ],
    });

    const organization = await requireOrganization();

    expect(organization.organizationId).toBe(ORG_A);
    expect(organization.organizationRole).toBe("org:editor");
    expect(organization.organizationSlug).toBe("org-a");
  });
});

describe("requireOrganizationRole", () => {
  it("allows a member with a matching role", async () => {
    mockSession({
      session: { id: SESSION_ID, activeOrganizationId: ORG_A },
      user: { id: USER_ID, email: "jane@example.com", name: "Jane", platformRole: "user" },
      membershipRows: [
        { organizationId: ORG_A, organizationSlug: "org-a", role: "org:admin", memberId: "mem_1" },
      ],
    });

    const organization = await requireOrganizationRole(["org:admin", "org:editor"]);

    expect(organization.organizationId).toBe(ORG_A);
  });

  it("rejects a role that is not in the allowed list", async () => {
    mockSession({
      session: { id: SESSION_ID, activeOrganizationId: ORG_A },
      user: { id: USER_ID, email: "jane@example.com", name: "Jane", platformRole: "user" },
      membershipRows: [
        { organizationId: ORG_A, organizationSlug: "org-a", role: "org:member", memberId: "mem_1" },
      ],
    });

    await expect(requireOrganizationRole(["org:admin"])).rejects.toMatchObject({
      code: "insufficient_role",
    });
  });

  it("rejects unauthenticated requests before role evaluation", async () => {
    mockSession({ session: null });

    await expect(requireOrganizationRole(["org:admin"])).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("rejects requests without an active organization before role evaluation", async () => {
    mockSession({
      session: { id: SESSION_ID, activeOrganizationId: null },
      user: { id: USER_ID, email: "jane@example.com", name: "Jane", platformRole: "user" },
    });

    await expect(requireOrganizationRole(["org:admin"])).rejects.toMatchObject({
      code: "missing_organization",
    });
  });

  it("handles comma-separated multi-role strings", async () => {
    mockSession({
      session: { id: SESSION_ID, activeOrganizationId: ORG_A },
      user: { id: USER_ID, email: "jane@example.com", name: "Jane", platformRole: "user" },
      membershipRows: [
        { organizationId: ORG_A, organizationSlug: "org-a", role: "org:editor,org:analyst", memberId: "mem_1" },
      ],
    });

    const organization = await requireOrganizationRole(["org:editor"]);

    expect(organization.organizationId).toBe(ORG_A);
    expect(organization.organizationRole).toBe("org:editor");
  });
});

describe("getCurrentActor", () => {
  it("returns null for unauthenticated requests", async () => {
    mockSession({ session: null });

    expect(await getCurrentActor()).toBeNull();
  });

  it("combines the Better Auth user with the active organization", async () => {
    mockSession({
      session: { id: SESSION_ID, activeOrganizationId: ORG_A },
      user: { id: USER_ID, email: "jane@example.com", name: "Jane Operator", platformRole: "user" },
      membershipRows: [
        { organizationId: ORG_A, organizationSlug: "org-a", role: "org:operator", memberId: "mem_1" },
      ],
    });

    const actor = await getCurrentActor();

    expect(actor).not.toBeNull();
    expect(actor?.actorId).toBe(USER_ID);
    expect(actor?.organizationId).toBe(ORG_A);
    expect(actor?.organizationRole).toBe("org:operator");
    expect(actor?.email).toBe("jane@example.com");
    expect(actor?.name).toBe("Jane Operator");
  });

  it("keeps organization fields null when no organization is active", async () => {
    mockSession({
      session: { id: SESSION_ID, activeOrganizationId: null },
      user: { id: USER_ID, email: "jane@example.com", name: "Jane", platformRole: "user" },
    });

    const actor = await getCurrentActor();

    expect(actor?.userId).toBe(USER_ID);
    expect(actor?.organizationId).toBeNull();
    expect(actor?.organizationRole).toBeNull();
  });
});

describe("requirePlatformAdmin", () => {
  it("rejects unauthenticated requests", async () => {
    mockSession({ session: null });

    await expect(requirePlatformAdmin()).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("rejects authenticated users without platform_admin role", async () => {
    mockSession({
      session: { id: SESSION_ID, activeOrganizationId: ORG_A },
      user: { id: USER_ID, email: "jane@example.com", name: "Jane", platformRole: "user" },
      membershipRows: [
        { organizationId: ORG_A, organizationSlug: "org-a", role: "org:admin", memberId: "mem_1" },
      ],
    });

    await expect(requirePlatformAdmin()).rejects.toMatchObject({
      code: "not_platform_admin",
    });
  });

  it("rejects non-string platformRole values", async () => {
    mockSession({
      session: { id: SESSION_ID, activeOrganizationId: ORG_A },
      user: { id: USER_ID, email: "jane@example.com", name: "Jane", platformRole: 42 },
      membershipRows: [
        { organizationId: ORG_A, organizationSlug: "org-a", role: "org:admin", memberId: "mem_1" },
      ],
    });

    await expect(requirePlatformAdmin()).rejects.toMatchObject({
      code: "not_platform_admin",
    });
  });

  it("returns the user id when the platform_admin role is set", async () => {
    mockSession({
      session: { id: SESSION_ID, activeOrganizationId: ORG_A },
      user: { id: USER_ID, email: "admin@example.com", name: "Admin", platformRole: "platform_admin" },
      membershipRows: [
        { organizationId: ORG_A, organizationSlug: "org-a", role: "org:admin", memberId: "mem_1" },
      ],
    });

    await expect(requirePlatformAdmin()).resolves.toBe(USER_ID);
  });
});

describe("requirePlatformAdminContext", () => {
  it("requires the platform_admin role and an active organization", async () => {
    mockSession({
      session: { id: SESSION_ID, activeOrganizationId: ORG_A },
      user: { id: USER_ID, email: "admin@example.com", name: "Admin", platformRole: "platform_admin" },
      membershipRows: [
        { organizationId: ORG_A, organizationSlug: "org-a", role: "org:admin", memberId: "mem_1" },
      ],
    });

    const context = await requirePlatformAdminContext();

    expect(context.userId).toBe(USER_ID);
    expect(context.organizationId).toBe(ORG_A);
    expect(context.organizationSlug).toBe("org-a");
  });

  it("rejects when the platform_admin role is missing even with an org", async () => {
    mockSession({
      session: { id: SESSION_ID, activeOrganizationId: ORG_A },
      user: { id: USER_ID, email: "jane@example.com", name: "Jane", platformRole: "user" },
      membershipRows: [
        { organizationId: ORG_A, organizationSlug: "org-a", role: "org:admin", memberId: "mem_1" },
      ],
    });

    await expect(requirePlatformAdminContext()).rejects.toMatchObject({
      code: "not_platform_admin",
    });
  });

  it("rejects when the platform admin has no active organization", async () => {
    mockSession({
      session: { id: SESSION_ID, activeOrganizationId: null },
      user: { id: USER_ID, email: "admin@example.com", name: "Admin", platformRole: "platform_admin" },
    });

    await expect(requirePlatformAdminContext()).rejects.toMatchObject({
      code: "missing_organization",
    });
  });
});

describe("isCurrentUserPlatformAdmin", () => {
  it("returns false when there is no signed-in user", async () => {
    mockSession({ session: null });

    expect(await isCurrentUserPlatformAdmin()).toBe(false);
  });

  it("returns true when the platform_admin role is set", async () => {
    mockSession({
      session: { id: SESSION_ID, activeOrganizationId: null },
      user: { id: USER_ID, email: "admin@example.com", name: "Admin", platformRole: "platform_admin" },
    });

    expect(await isCurrentUserPlatformAdmin()).toBe(true);
  });

  it("returns false when the role is absent", async () => {
    mockSession({
      session: { id: SESSION_ID, activeOrganizationId: null },
      user: { id: USER_ID, email: "jane@example.com", name: "Jane", platformRole: "user" },
    });

    expect(await isCurrentUserPlatformAdmin()).toBe(false);
  });

  it("returns false for non-string platformRole values", async () => {
    mockSession({
      session: { id: SESSION_ID, activeOrganizationId: null },
      user: { id: USER_ID, email: "jane@example.com", name: "Jane", platformRole: true },
    });

    expect(await isCurrentUserPlatformAdmin()).toBe(false);
  });
});

describe("AuthContextError", () => {
  it("exposes a stable machine-readable code", () => {
    const error = new AuthContextError("missing_organization", "No organization selected");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AuthContextError");
    expect(error.code).toBe("missing_organization");
    expect(error.message).toBe("No organization selected");
  });
});
