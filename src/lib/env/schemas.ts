import { z } from "zod";

export const nodeEnvSchema = z.enum(["development", "test", "production"]);

/**
 * Application-level environment without secrets. These values are safe to
 * embed in the client bundle when prefixed with NEXT_PUBLIC_.
 */
export const appEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema.default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

/**
 * Database environment. `DATABASE_URL` holds the PostgreSQL connection
 * string and is a secret. It is validated only at database boundaries so the
 * application can still boot (and serve `/api/health`) before a database is
 * provisioned.
 */
export const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required to use the database"),
});

/**
 * Better Auth server environment. `BETTER_AUTH_SECRET` signs and encrypts
 * session cookies and must never be exposed to the browser or referenced from
 * a `NEXT_PUBLIC_*` variable. `BETTER_AUTH_URL` is the canonical base URL of
 * the auth handler (http://localhost:3000 in development).
 *
 * Validated only inside the server auth boundary so the rest of the app can
 * boot without it (e.g. static pages, `/api/health`).
 */
export const authEnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string().trim().min(1, "BETTER_AUTH_SECRET is required for authentication"),
  BETTER_AUTH_URL: z.string().trim().url().default("http://localhost:3000"),
});
