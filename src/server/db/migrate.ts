import { existsSync } from "node:fs";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { getDatabaseEnv } from "@/lib/env";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

function loadLocalEnvFile() {
  if (typeof process.loadEnvFile !== "function") return;
  if (!existsSync(".env.local")) return;
  process.loadEnvFile(".env.local");
}

/**
 * Run pending Drizzle migrations against the configured database.
 * Used by the `db:migrate` script. Requires a valid DATABASE_URL.
 */
export async function runMigrations() {
  loadLocalEnvFile();
  const { DATABASE_URL } = getDatabaseEnv();
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client);
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
  } finally {
    await client.end();
  }
}

// Allow running directly: pnpm tsx src/server/db/migrate.ts
if (process.argv[1] && process.argv[1].endsWith("migrate.ts")) {
  runMigrations()
    .then(() => {
      process.stdout.write("Migrations complete.\n");
      process.exit(0);
    })
    .catch((error) => {
      process.stderr.write(`Migration failed: ${String(error)}\n`);
      process.exit(1);
    });
}
