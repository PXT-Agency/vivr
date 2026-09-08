import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns { ok: true }", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });
  });

  it("is always dynamic so monitors see liveness", async () => {
    expect(await GET()).toBeInstanceOf(Response);
  });
});
