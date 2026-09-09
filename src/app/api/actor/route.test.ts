import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCurrentActor } from "@/server/auth";

import { GET } from "./route";

vi.mock("@/server/auth", () => ({
  getCurrentActor: vi.fn(),
}));

const getCurrentActorMock = vi.mocked(getCurrentActor);

describe("GET /api/actor", () => {
  beforeEach(() => {
    getCurrentActorMock.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    getCurrentActorMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "unauthenticated" });
  });

  it("returns the actor when authenticated with an active organization", async () => {
    getCurrentActorMock.mockResolvedValue({
      actorId: "user_test_123",
      userId: "user_test_123",
      organizationId: "org_test_aaa",
      organizationRole: "org:admin",
      organizationSlug: "org-a",
      email: "jane@example.com",
      name: "Jane Admin",
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      actor: {
        actorId: "user_test_123",
        userId: "user_test_123",
        organizationId: "org_test_aaa",
        organizationRole: "org:admin",
        organizationSlug: "org-a",
        email: "jane@example.com",
        name: "Jane Admin",
      },
    });
  });

  it("resolves the actor server-side without reading request input", async () => {
    getCurrentActorMock.mockResolvedValue(null);

    await GET();

    expect(getCurrentActorMock).toHaveBeenCalledTimes(1);
    expect(getCurrentActorMock).toHaveBeenCalledWith();
  });
});
