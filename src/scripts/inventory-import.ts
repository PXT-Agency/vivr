import { existsSync } from "node:fs";

import {
  DEFAULT_SOURCE_DIR,
  InventoryImportError,
  runInventoryImport,
} from "@/server/services/inventory/importService";
import { createDatabase } from "@/server/db";
import {
  createInventoryImportRepository,
} from "@/server/repositories/inventory-imports";
import { createOrganizationRepository } from "@/server/repositories/organizations";

/**
 * CLI surface for the star-number inventory import (docs/02).
 *
 * This is a local operator tool (run with pnpm tsx / pnpm inventory:import).
 * It performs the same import as the platform-admin API but does not itself
 * resolve a Clerk session; the operator identity is supplied via CLI flags or
 * environment variables (IMPORT_ACTOR_USER_ID / IMPORT_ACTOR_ORG_ID). The
 * platform-admin gate is enforced on the API surface; the CLI never prints
 * credentials or connection strings.
 */

function loadLocalEnvFile() {
  if (typeof process.loadEnvFile !== "function") return;
  if (!existsSync(".env.local")) return;
  process.loadEnvFile(".env.local");
}

interface CliOptions {
  mode: "dry_run" | "commit";
  sourceDir: string;
  expectedStart?: string;
  expectedEnd?: string;
  allowCategoryUpdate: boolean;
  actorUserId: string;
  actorOrganizationId: string;
  list: boolean;
}

function usage(): string {
  return [
    "Usage: pnpm inventory:import [options]",
    "",
    "Options:",
    "  --list                          List recent import batches and exit.",
    "  --mode <dry_run|commit>        Import mode (default: dry_run).",
    "  --source-dir <path>            Source directory (default: docs).",
    "  --expected-start <0001>        Expected range start (e.g. 0001).",
    "  --expected-end <2000>          Expected range end (e.g. 2000).",
    "  --allow-category-update        Allow category updates in commit mode.",
    "  --actor-user-id <id>           Operator Clerk user ID.",
    "  --actor-org-id <id>            Operator organization ID.",
    "",
    "Operator identity can also be supplied via IMPORT_ACTOR_USER_ID and",
    "IMPORT_ACTOR_ORG_ID environment variables.",
  ].join("\n");
}

function parseArgs(argv: string[]): CliOptions | { error: string } {
  const options: CliOptions = {
    mode: "dry_run",
    sourceDir: DEFAULT_SOURCE_DIR,
    actorUserId: process.env.IMPORT_ACTOR_USER_ID ?? "",
    actorOrganizationId: process.env.IMPORT_ACTOR_ORG_ID ?? "",
    allowCategoryUpdate: false,
    list: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];

    switch (arg) {
      case "--list":
        options.list = true;
        break;
      case "--mode":
        if (value !== "dry_run" && value !== "commit") {
          return { error: `Invalid --mode "${value}". Expected dry_run or commit.` };
        }
        options.mode = value;
        index += 1;
        break;
      case "--source-dir":
        if (!value) return { error: "--source-dir requires a path." };
        options.sourceDir = value;
        index += 1;
        break;
      case "--expected-start":
        if (!value) return { error: "--expected-start requires a four-digit code." };
        options.expectedStart = value;
        index += 1;
        break;
      case "--expected-end":
        if (!value) return { error: "--expected-end requires a four-digit code." };
        options.expectedEnd = value;
        index += 1;
        break;
      case "--allow-category-update":
        options.allowCategoryUpdate = true;
        break;
      case "--actor-user-id":
        if (!value) return { error: "--actor-user-id requires a value." };
        options.actorUserId = value;
        index += 1;
        break;
      case "--actor-org-id":
        if (!value) return { error: "--actor-org-id requires a value." };
        options.actorOrganizationId = value;
        index += 1;
        break;
      case "--help":
      case "-h":
        return { error: "" };
      default:
        return { error: `Unknown option "${arg}".` };
    }
  }

  if (!options.list && (!options.actorUserId || !options.actorOrganizationId)) {
    return {
      error:
        "Operator identity is required: pass --actor-user-id and --actor-org-id, or set IMPORT_ACTOR_USER_ID / IMPORT_ACTOR_ORG_ID.",
    };
  }

  return options;
}

function printSummary(summary: ReturnType<typeof summarize>): void {
  const lines = [
    `mode: ${summary.mode}`,
    `batch: ${summary.batch}`,
    `status: ${summary.status}`,
    `total rows: ${summary.total}`,
    `accepted: ${summary.accepted}`,
    `rejected: ${summary.rejected}`,
    `duplicate: ${summary.duplicate}`,
    `conflict: ${summary.conflict}`,
    `missing: ${summary.missing}`,
    `created: ${summary.created}`,
    `updated: ${summary.updated}`,
    `already present: ${summary.alreadyPresent}`,
    `already processed: ${summary.alreadyProcessed}`,
  ];

  if (summary.missing > 0 && summary.missingCodes.length > 0) {
    const shown = summary.missingCodes.slice(0, 10).join(", ");
    const suffix = summary.missingCodes.length > 10
      ? `\n  … and ${summary.missingCodes.length - 10} more`
      : "";
    lines.push(`missing codes: ${shown}${suffix}`);
  }

  if (summary.status === "failed") {
    lines.push(
      "Inspect the batch rows and the source before retrying; failed commits write no star_numbers rows.",
    );
  }
  if (summary.mode === "dry_run") {
    lines.push(
      "DRY RUN: no star_numbers were modified. Re-run with --mode commit to apply.",
    );
  }

  process.stdout.write(`${lines.join("\n")}\n`);
}

interface SummaryShape {
  mode: string;
  batch: string;
  status: string;
  total: number;
  accepted: number;
  rejected: number;
  duplicate: number;
  conflict: number;
  missing: number;
  created: number;
  updated: number;
  alreadyPresent: number;
  alreadyProcessed: boolean;
  missingCodes: string[];
}

function summarize(batchId: string, result: {
  batch: { status: string; mode: string };
  summary: {
    total: number;
    accepted: number;
    rejected: number;
    duplicate: number;
    conflict: number;
    missing: number;
    created: number;
    updated: number;
    alreadyPresent: number;
    alreadyProcessed: boolean;
    missingCodes: string[];
  };
}): SummaryShape {
  return {
    mode: result.batch.mode,
    batch: batchId,
    status: result.batch.status,
    total: result.summary.total,
    accepted: result.summary.accepted,
    rejected: result.summary.rejected,
    duplicate: result.summary.duplicate,
    conflict: result.summary.conflict,
    missing: result.summary.missing,
    created: result.summary.created,
    updated: result.summary.updated,
    alreadyPresent: result.summary.alreadyPresent,
    alreadyProcessed: result.summary.alreadyProcessed,
    missingCodes: result.summary.missingCodes,
  };
}

async function listRecentBatches(): Promise<void> {
  const { client, db } = createDatabase();
  try {
    const batches = await createInventoryImportRepository(db).listBatches(20);
    process.stdout.write(`recent batches: ${batches.length}\n`);
    for (const batch of batches) {
      const summary =
        batch.summaryJson && typeof batch.summaryJson === "object"
          ? (batch.summaryJson as Record<string, unknown>)
          : {};
      process.stdout.write(
        [
          `  ${batch.id}`,
          `    mode=${batch.mode} status=${batch.status} source=${batch.sourceName}`,
          `    startedAt=${batch.startedAt.toISOString()}`,
          `    accepted=${String(summary.accepted ?? "-")} rejected=${String(summary.rejected ?? "-")} conflict=${String(summary.conflict ?? "-")} missing=${String(summary.missing ?? "-")}`,
        ].join("\n") + "\n",
      );
    }
  } finally {
    await client.end();
  }
}

export async function main(): Promise<number> {
  loadLocalEnvFile();

  const parsed = parseArgs(process.argv.slice(2));
  if ("error" in parsed) {
    process.stderr.write(parsed.error === "" ? usage() : `${parsed.error}\n\n${usage()}`);
    return parsed.error === "" ? 0 : 1;
  }

  if (parsed.list) {
    await listRecentBatches();
    return 0;
  }

  const { client, db } = createDatabase();
  try {
    // The actor references the organization mirror; ensure it exists for the
    // local operator so the FK is satisfied. The platform-admin gate is
    // enforced on the API surface, not in this local tool.
    await createOrganizationRepository(db).upsert({
      id: parsed.actorOrganizationId,
      name: parsed.actorOrganizationId,
      slug: parsed.actorOrganizationId.toLowerCase(),
    });

    const result = await runInventoryImport(db, {
      mode: parsed.mode,
      sourceDir: parsed.sourceDir,
      expectedStart: parsed.expectedStart,
      expectedEnd: parsed.expectedEnd,
      allowCategoryUpdate: parsed.allowCategoryUpdate,
      actor: {
        userId: parsed.actorUserId,
        organizationId: parsed.actorOrganizationId,
      },
    });

    printSummary(summarize(result.batch.id, result));
    return result.batch.status === "failed" ? 2 : 0;
  } catch (error) {
    if (error instanceof InventoryImportError) {
      process.stderr.write(`Import failed [${error.code}]: ${error.message}\n`);
    } else {
      process.stderr.write(`Import failed: ${String(error)}\n`);
    }
    return 1;
  } finally {
    await client.end();
  }
}

// Allow running directly: pnpm tsx src/scripts/inventory-import.ts
if (process.argv[1] && process.argv[1].endsWith("inventory-import.ts")) {
  main()
    .then((code) => process.exit(code))
    .catch((error) => {
      process.stderr.write(`${String(error)}\n`);
      process.exit(1);
    });
}