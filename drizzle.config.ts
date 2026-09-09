import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

function loadLocalEnvFile() {
  if (typeof process.loadEnvFile !== "function") return;
  if (!existsSync(".env.local")) return;
  process.loadEnvFile(".env.local");
}

loadLocalEnvFile();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
