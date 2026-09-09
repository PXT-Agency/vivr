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

const authMock = vi.hoisted(() => vi.fn());
const currentUserMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
}));

type AuthState = {
  isAuthenticated: boolean;
  userId: string | null;
  sessionId: string | null;
  orgId: string | null;
  orgRole: string | null;
  orgSlug: string | null;
};

function mockAuth(state: Partial<AuthState>) {
  authMock.mockResolvedValue({
    isAuthenticated: false,
    userId: null,
    sessionId: null,
    orgId: null,
    orgRole: null,
    orgSlug: null,
    ...state,
  });
}

const USER_ID = "user_test_123";
const ORG_A = "org_test_aaa";
const SESSION_ID = "sess_test_123";

beforeEach(() => {
  authMock.mockReset();
  currentUserMock.mockReset();
});

describe("getAuthContext", () => {
  it("returns null for unauthenticated requests", async () => {
    mockAuth({ isAuthenticated: false });

    expect(await getAuthContext()).toBeNull();
  });

  it("returns user and organization context when authenticated with an active organization", async () => {
    mockAuth({
      isAuthenticated: true,
      userId: USER_ID,
      sessionId: SESSION_ID,
      orgId: ORG_A,
      orgRole: "org:admin",
      orgSlug: "org-a",
    });

    const context = await getAuthContext();

    expect(context).not.toBeNull();
    expect(context?.userId).toBe(USER_ID);
    expect(context?.organizationId).toBe(ORG_A);
    expect(context?.organizationRole).toBe("org:admin");
    expect(context?.organizationSlug).toBe("org-a");
  });

  it("keeps organization fields null when no organization is active", async () => {
    mockAuth({
      isAuthenticated: true,
      userId: USER_ID,
      sessionId: SESSION_ID,
      orgId: null,
      orgRole: null,
      orgSlug: null,
    });

    const context = await getAuthContext();

    expect(context?.userId).toBe(USER_ID);
    expect(context?.organizationId).toBeNull();
    expect(context?.organizationRole).toBeNull();
  });

  it("ignores non-application organization roles", async () => {
    mockAuth({
      isAuthenticated: true,
      userId: USER_ID,
      orgId: ORG_A,
      orgRole: "org:basic",
      orgSlug: "org-a",
    });

    const context = await getAuthContext();

    expect(context?.organizationId).toBe(ORG_A);
    expect(context?.organizationRole).toBeNull();
  });
});

describe("requireAuth", () => {
  it("rejects unauthenticated requests", async () => {
    mockAuth({ isAuthenticated: false });

    await expect(requireAuth()).rejects.toMatchObject({
      name: "AuthContextError",
      code: "unauthenticated",
    });
  });

  it("rejects when Clerk reports a session without a user id", async () => {
    mockAuth({ isAuthenticated: true, userId: null });

    await expect(requireAuth()).rejects.toBeInstanceOf(AuthContextError);
  });

  it("returns the auth context when authenticated", async () => {
    mockAuth({
      isAuthenticated: true,
      userId: USER_ID,
      sessionId: SESSION_ID,
      orgId: ORG_A,
      orgRole: "org:member",
      orgSlug: "org-a",
    });

    const context = await requireAuth();

    expect(context.userId).toBe(USER_ID);
    expect(context.organizationId).toBe(ORG_A);
  });
});

describe("requireOrganization", () => {
  it("rejects unauthenticated requests", async () => {
    mockAuth({ isAuthenticated: false });

    await expect(requireOrganization()).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("rejects authenticated requests without an active organization", async () => {
    mockAuth({ isAuthenticated: true, userId: USER_ID });

    await expect(requireOrganization()).rejects.toMatchObject({
      code: "missing_organization",
    });
  });

  it("rejects when the active organization has no usable role", async () => {
    mockAuth({
      isAuthenticated: true,
      userId: USER_ID,
      orgId: ORG_A,
      orgRole: "org:unknown",
      orgSlug: "org-a",
    });

    await expect(requireOrganization()).rejects.toMatchObject({
      code: "missing_organization",
    });
  });

  it("returns a typed organization id when an organization is active", async () => {
    mockAuth({
      isAuthenticated: true,
      userId: USER_ID,
      orgId: ORG_A,
      orgRole: "org:editor",
      orgSlug: "org-a",
    });

    const organization = await requireOrganization();

    expect(organization.organizationId).toBe(ORG_A);
    expect(organization.organizationRole).toBe("org:editor");
    expect(organization.organizationSlug).toBe("org-a");
  });
});

describe("requireOrganizationRole", () => {
  it("allows a member with a matching role", async () => {
    mockAuth({
      isAuthenticated: true,
      userId: USER_ID,
      orgId: ORG_A,
      orgRole: "org:admin",
      orgSlug: "org-a",
    });

    const organization = await requireOrganizationRole(["org:admin", "org:editor"]);

    expect(organization.organizationId).toBe(ORG_A);
  });

  it("rejects a role that is not in the allowed list", async () => {
    mockAuth({
      isAuthenticated: true,
      userId: USER_ID,
      orgId: ORG_A,
      orgRole: "org:member",
      orgSlug: "org-a",
    });

    await expect(requireOrganizationRole(["org:admin"])).rejects.toMatchObject({
      code: "insufficient_role",
    });
  });

  it("rejects unauthenticated requests before role evaluation", async () => {
    mockAuth({ isAuthenticated: false });

    await expect(requireOrganizationRole(["org:admin"])).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("rejects requests without an active organization before role evaluation", async () => {
    mockAuth({ isAuthenticated: true, userId: USER_ID });

    await expect(requireOrganizationRole(["org:admin"])).rejects.toMatchObject({
      code: "missing_organization",
    });
  });
});

describe("getCurrentActor", () => {
  it("returns null for unauthenticated requests", async () => {
    mockAuth({ isAuthenticated: false });
    currentUserMock.mockResolvedValue(null);

    expect(await getCurrentActor()).toBeNull();
  });

  it("combines the Clerk user with the active organization", async () => {
    mockAuth({
      isAuthenticated: true,
      userId: USER_ID,
      sessionId: SESSION_ID,
      orgId: ORG_A,
      orgRole: "org:operator",
      orgSlug: "org-a",
    });
    currentUserMock.mockResolvedValue({
      id: USER_ID,
      fullName: "Jane Operator",
      username: "jane",
      primaryEmailAddressId: "email_1",
      emailAddresses: [{ id: "email_1", emailAddress: "jane@example.com" }],
    });

    const actor = await getCurrentActor();

    expect(actor).not.toBeNull();
    expect(actor?.actorId).toBe(USER_ID);
    expect(actor?.organizationId).toBe(ORG_A);
    expect(actor?.organizationRole).toBe("org:operator");
    expect(actor?.email).toBe("jane@example.com");
    expect(actor?.name).toBe("Jane Operator");
  });

  it("returns null when the session is valid but the user cannot be loaded", async () => {
    mockAuth({
      isAuthenticated: true,
      userId: USER_ID,
      orgId: ORG_A,
      orgRole: "org:member",
      orgSlug: "org-a",
    });
    currentUserMock.mockResolvedValue(null);

    expect(await getCurrentActor()).toBeNull();
  });

  it("keeps organization fields null when no organization is active", async () => {
    mockAuth({ isAuthenticated: true, userId: USER_ID, sessionId: SESSION_ID });
    currentUserMock.mockResolvedValue({
      id: USER_ID,
      fullName: "Jane Operator",
      username: "jane",
      primaryEmailAddressId: "email_1",
      emailAddresses: [{ id: "email_1", emailAddress: "jane@example.com" }],
    });

    const actor = await getCurrentActor();

    expect(actor?.userId).toBe(USER_ID);
    expect(actor?.organizationId).toBeNull();
    expect(actor?.organizationRole).toBeNull();
  });
});

describe("requirePlatformAdmin", () => {
  it("rejects unauthenticated requests", async () => {
    mockAuth({ isAuthenticated: false });
    currentUserMock.mockResolvedValue(null);

    await expect(requirePlatformAdmin()).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("rejects authenticated users without the platform-admin metadata flag", async () => {
    mockAuth({ isAuthenticated: true, userId: USER_ID, orgId: ORG_A, orgRole: "org:admin", orgSlug: "org-a" });
    currentUserMock.mockResolvedValue({ id: USER_ID, publicMetadata: {} });

    await expect(requirePlatformAdmin()).rejects.toMatchObject({
      code: "not_platform_admin",
    });
  });

  it("rejects flag values that are not the strict boolean true", async () => {
    mockAuth({ isAuthenticated: true, userId: USER_ID });
    currentUserMock.mockResolvedValue({
      id: USER_ID,
      publicMetadata: { platformAdmin: "true" },
    });

    await expect(requirePlatformAdmin()).rejects.toMatchObject({
      code: "not_platform_admin",
    });
  });

  it("returns the user id when the platform-admin flag is set", async () => {
    mockAuth({ isAuthenticated: true, userId: USER_ID, orgId: ORG_A, orgRole: "org:admin", orgSlug: "org-a" });
    currentUserMock.mockResolvedValue({
      id: USER_ID,
      publicMetadata: { platformAdmin: true },
    });

    await expect(requirePlatformAdmin()).resolves.toBe(USER_ID);
  });
});

describe("requirePlatformAdminContext", () => {
  it("requires the platform-admin flag and an active organization", async () => {
    mockAuth({ isAuthenticated: true, userId: USER_ID, orgId: ORG_A, orgRole: "org:admin", orgSlug: "org-a" });
    currentUserMock.mockResolvedValue({
      id: USER_ID,
      publicMetadata: { platformAdmin: true },
    });

    const context = await requirePlatformAdminContext();

    expect(context.userId).toBe(USER_ID);
    expect(context.organizationId).toBe(ORG_A);
    expect(context.organizationSlug).toBe("org-a");
  });

  it("rejects when the platform-admin flag is missing even with an org", async () => {
    mockAuth({ isAuthenticated: true, userId: USER_ID, orgId: ORG_A, orgRole: "org:admin", orgSlug: "org-a" });
    currentUserMock.mockResolvedValue({ id: USER_ID, publicMetadata: {} });

    await expect(requirePlatformAdminContext()).rejects.toMatchObject({
      code: "not_platform_admin",
    });
  });

  it("rejects when the platform admin has no active organization", async () => {
    mockAuth({ isAuthenticated: true, userId: USER_ID });
    currentUserMock.mockResolvedValue({
      id: USER_ID,
      publicMetadata: { platformAdmin: true },
    });

    await expect(requirePlatformAdminContext()).rejects.toMatchObject({
      code: "missing_organization",
    });
  });
});

describe("isCurrentUserPlatformAdmin", () => {
  it("returns false when there is no signed-in user", async () => {
    currentUserMock.mockResolvedValue(null);

    expect(await isCurrentUserPlatformAdmin()).toBe(false);
  });

  it("returns true when the platform-admin flag is set", async () => {
    currentUserMock.mockResolvedValue({
      id: USER_ID,
      publicMetadata: { platformAdmin: true },
    });

    expect(await isCurrentUserPlatformAdmin()).toBe(true);
  });

  it("returns false when the flag is absent", async () => {
    currentUserMock.mockResolvedValue({ id: USER_ID, publicMetadata: {} });

    expect(await isCurrentUserPlatformAdmin()).toBe(false);
  });

  it("returns false for flag values other than the strict boolean true", async () => {
    currentUserMock.mockResolvedValue({
      id: USER_ID,
      publicMetadata: { platformAdmin: "true" },
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
