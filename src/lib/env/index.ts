import { appEnvSchema, databaseEnvSchema } from "./schemas";

export type AppEnv = ReturnType<typeof appEnvSchema.parse>;
export type DatabaseEnv = ReturnType<typeof databaseEnvSchema.parse>;

/**
 * Environment validation error. Thrown when required environment variables are
 * missing or malformed so that failures are clear rather than silently ignored.
 */
export class EnvironmentValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid environment configuration:\n${issues.map((i) => `  - ${i}`).join("\n")}`);
    this.name = "EnvironmentValidationError";
    this.issues = issues;
  }
}

const asIssues = (error: unknown): string[] => {
  if (error && typeof error === "object" && "issues" in error && Array.isArray(error.issues)) {
    return (
      error as { issues: Array<{ path: Array<string | number>; message: string }> }
    ).issues.map((issue) => `${issue.path.join(".") || "value"}: ${issue.message}`);
  }
  return ["Unknown environment validation error"];
};

/**
 * Parse the application-level environment. Uses safe defaults so the app can
 * start without throwing, but surfaces validation errors for variables that
 * are required with no acceptable default.
 */
export function getAppEnv(overrides: Record<string, string | undefined> = process.env): AppEnv {
  const result = appEnvSchema.safeParse(overrides);
  if (!result.success) {
    throw new EnvironmentValidationError(asIssues(result.error));
  }
  return result.data;
}

/**
 * Parse the database environment. Required before any database access.
 * Throws EnvironmentValidationError when DATABASE_URL is absent.
 */
export function getDatabaseEnv(
  overrides: Record<string, string | undefined> = process.env,
): DatabaseEnv {
  const result = databaseEnvSchema.safeParse(overrides);
  if (!result.success) {
    throw new EnvironmentValidationError(asIssues(result.error));
  }
  return result.data;
}
