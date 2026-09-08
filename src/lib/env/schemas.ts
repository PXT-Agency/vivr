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
