import { existsSync, readFileSync } from "node:fs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "./schema";
import * as relations from "./schema/relations";
import type { Db } from ".";

const TEST_DB_NAME = "vivr_test";

/**
 * Load DATABASE_URL from the `.env.local` override (matching the pattern used
 * by the migrate script) and point it at the dedicated test database.
 */
function loadTestDatabaseUrl(): string {
  let raw = process.env.DATABASE_URL;
  if (!raw && existsSync(".env.local")) {
    raw = readFileSync(".env.local", "utf8")
      .split("\n")
      .find((line) => line.startsWith("DATABASE_URL="))
      ?.slice("DATABASE_URL=".length)
      .trim();
  }
  if (!raw) {
    throw new Error("DATABASE_URL is required for integration tests.");
  }
  const url = new URL(raw);
  url.pathname = `/${TEST_DB_NAME}`;
  return url.toString();
}

export interface TestDatabase {
  client: postgres.Sql;
  db: Db;
  close: () => Promise<void>;
}

/**
 * Open a connection to the dedicated vivr_test database. Schema and migrations
 * were applied separately (db:migrate run against vivr_test); tests must call
 * `resetDatabase` between cases. Never creates or mutates tables.
 */
export function connectTestDatabase(): TestDatabase {
  const client = postgres(loadTestDatabaseUrl(), { max: 1 });
  const db = drizzle(client, { schema: { ...schema, ...relations } });
  return {
    client,
    db,
    close: () => client.end(),
  };
}

/**
 * Truncate all application tables between tests so each case starts clean.
 * Runs in a single round trip on the raw client (never exposed to production
 * code paths). Includes the Better Auth tables (user, session, account,
 * verification, member, invitation).
 */
export async function resetDatabase({ client }: TestDatabase): Promise<void> {
  await client`TRUNCATE TABLE
    inventory_import_rows,
    star_numbers,
    inventory_import_batches,
    vivr_versions,
    vivrs,
    actors,
    organizations,
    invitation,
    member,
    verification,
    account,
    session,
    "user"
  RESTART IDENTITY CASCADE`;
}