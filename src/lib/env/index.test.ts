import { describe, expect, it } from "vitest";

import { EnvironmentValidationError, getAppEnv, getAuthEnv, getDatabaseEnv } from "./index";

describe("getAppEnv", () => {
  it("defaults NODE_ENV and NEXT_PUBLIC_APP_URL when no env is provided", () => {
    const env = getAppEnv({});
    expect(env.NODE_ENV).toBe("development");
    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("reads provided values", () => {
    const env = getAppEnv({
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://vivr.example.com",
    });
    expect(env.NODE_ENV).toBe("production");
    expect(env.NEXT_PUBLIC_APP_URL).toBe("https://vivr.example.com");
  });

  it("rejects an invalid NODE_ENV", () => {
    expect(() => getAppEnv({ NODE_ENV: "staging" })).toThrow(EnvironmentValidationError);
  });

  it("rejects a malformed NEXT_PUBLIC_APP_URL", () => {
    expect(() => getAppEnv({ NEXT_PUBLIC_APP_URL: "not-a-url" })).toThrow(
      EnvironmentValidationError,
    );
  });
});

describe("getDatabaseEnv", () => {
  it("parses a valid DATABASE_URL", () => {
    const env = getDatabaseEnv({ DATABASE_URL: "postgres://user:pass@localhost:5432/vivr" });
    expect(env.DATABASE_URL).toBe("postgres://user:pass@localhost:5432/vivr");
  });

  it("throws a clear error when DATABASE_URL is absent", () => {
    try {
      getDatabaseEnv({});
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(EnvironmentValidationError);
      const envError = error as EnvironmentValidationError;
      expect(envError.issues.some((issue) => issue.includes("DATABASE_URL"))).toBe(true);
    }
  });

  it("throws a clear error when DATABASE_URL is empty", () => {
    expect(() => getDatabaseEnv({ DATABASE_URL: "  " })).toThrow(EnvironmentValidationError);
  });
});

describe("getAuthEnv", () => {
  it("parses valid Better Auth environment variables", () => {
    const env = getAuthEnv({
      BETTER_AUTH_SECRET: "super-secret-key-at-least-32-chars-long!!",
      BETTER_AUTH_URL: "http://localhost:3000",
    });
    expect(env.BETTER_AUTH_SECRET).toBe("super-secret-key-at-least-32-chars-long!!");
    expect(env.BETTER_AUTH_URL).toBe("http://localhost:3000");
  });

  it("defaults BETTER_AUTH_URL to http://localhost:3000", () => {
    const env = getAuthEnv({
      BETTER_AUTH_SECRET: "valid-secret-12345678901234567890",
    });
    expect(env.BETTER_AUTH_URL).toBe("http://localhost:3000");
  });

  it("throws when BETTER_AUTH_SECRET is absent", () => {
    expect(() => getAuthEnv({})).toThrow(EnvironmentValidationError);
  });

  it("throws when BETTER_AUTH_SECRET is empty", () => {
    expect(() => getAuthEnv({ BETTER_AUTH_SECRET: "  " })).toThrow(
      EnvironmentValidationError,
    );
  });

  it("throws when BETTER_AUTH_URL is not a valid URL", () => {
    expect(() =>
      getAuthEnv({
        BETTER_AUTH_SECRET: "valid-secret-12345678901234567890",
        BETTER_AUTH_URL: "not-a-url",
      }),
    ).toThrow(EnvironmentValidationError);
  });
});
