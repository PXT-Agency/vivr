import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { getDatabaseEnv } from "@/lib/env";
import * as schema from "./schema";

export type Database = ReturnType<typeof createDatabase>;

/**
 * Create a PostgreSQL client and Drizzle instance bound to the application
 * schema. Requires a valid DATABASE_URL at the database boundary.
 */
export function createDatabase() {
  const { DATABASE_URL } = getDatabaseEnv();

  const client = postgres(DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return {
    client,
    db: drizzle(client, { schema }),
  };
}
