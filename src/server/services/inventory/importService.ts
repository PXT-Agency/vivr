import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  isImportBatchMode,
  type ImportBatchMode,
  type ImportBatchStatus,
  type StarNumberCategory,
  type StarNumberStatus,
} from "@/config/starNumbers";
import type { Db } from "@/server/db";
import type { InventoryImportBatchRow } from "@/server/db/schema";
import { createActorRepository } from "@/server/repositories/actors";
import {
  createInventoryImportRepository,
  type ImportBatchSummaryDetail,
} from "@/server/repositories/inventory-imports";
import { createStarNumberRepository } from "@/server/repositories/star-numbers";

import { normalizeRows, parseSource, type NormalizedRow } from "./parsers";

export const STAR_INVENTORY_PART_1 = "star-inventory-part-01-2.md";
export const STAR_INVENTORY_PART_2 = "star-inventory-part-02.csv";

export const DEFAULT_SOURCE_DIR = "docs";

export interface ImportActor {
  userId: string;
  organizationId: string;
}

export interface InventoryImportOptions {
  mode: ImportBatchMode;
  /** Directory containing the two source files. Defaults to `docs`. */
  sourceDir?: string;
  /** Optional expected range start, e.g. `0001`. */
  expectedStart?: string;
  /** Optional expected range end, e.g. `2000`. */
  expectedEnd?: string;
  /** Explicit import flag: allow category updates on `available` records. */
  allowCategoryUpdate?: boolean;
  actor: ImportActor;
}

export interface InventoryImportResult {
  batch: InventoryImportBatchRow;
  summary: ImportBatchSummaryDetail;
}

/** Error thrown when the import cannot run or a fatal condition is detected. */
export class InventoryImportError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "InventoryImportError";
    this.code = code;
  }
}

const CODE_PATTERN = /^[0-9]{4}$/;

/**
 * Advance a zero-padded four-digit code string by one (string arithmetic only;
 * codes are never coerced to integers). Returns null when the code would reach
 * 10000 (out of the four-digit format).
 */
function incrementCode(code: string): string | null {
  let value = parseInt(code, 10);
  if (Number.isNaN(value) || value >= 9999) return null;
  value += 1;
  return String(value).padStart(4, "0");
}

/** Enumerate the inclusive expected range as zero-padded code strings. */
export function enumerateCodeRange(start: string, end: string): string[] {
  if (!CODE_PATTERN.test(start) || !CODE_PATTERN.test(end)) {
    throw new InventoryImportError(
      "invalid_expected_range",
      `Expected range must be four-digit codes, got "${start}"–"${end}".`,
    );
  }
  const codes: string[] = [];
  let cursor: string | null = start;
  while (cursor !== null) {
    codes.push(cursor);
    if (cursor === end) break;
    cursor = incrementCode(cursor);
  }
  if (codes[codes.length - 1] !== end) {
    throw new InventoryImportError(
      "invalid_expected_range",
      `Expected range end "${end}" is before start "${start}".`,
    );
  }
  return codes;
}

type RowClassification = "accepted" | "rejected" | "duplicate";

interface Resolution {
  row: NormalizedRow;
  result: "accepted" | "conflict";
  action: "created" | "updated" | "already_present" | null;
  errorCode: string | null;
  errorMessage: string | null;
}

const ADVANCED_STATUSES: ReadonlySet<StarNumberStatus> = new Set([
  "reserved",
  "sold",
  "suspended",
  "released",
  "retired",
]);

/**
 * Read the two source files from `sourceDir`, returning raw content strings.
 * File paths are derived from the configurable source directory.
 */
async function readSources(
  sourceDir: string,
): Promise<{ part1: string; part2: string }> {
  const [part1, part2] = await Promise.all([
    readFile(join(sourceDir, STAR_INVENTORY_PART_1), "utf8").catch((error) => {
      throw new InventoryImportError(
        "missing_source_file",
        `Cannot read ${STAR_INVENTORY_PART_1}: ${String(error)}`,
      );
    }),
    readFile(join(sourceDir, STAR_INVENTORY_PART_2), "utf8").catch((error) => {
      throw new InventoryImportError(
        "missing_source_file",
        `Cannot read ${STAR_INVENTORY_PART_2}: ${String(error)}`,
      );
    }),
  ]);
  return { part1, part2 };
}

function hashSources(part1: string, part2: string): string {
  return createHash("sha256").update(`${part1}\n${part2}`).digest("hex");
}

interface ParsedSource {
  rows: NormalizedRow[];
  classification: Map<NormalizedRow, RowClassification>;
  accepted: NormalizedRow[];
  duplicateCount: number;
  rejectedCount: number;
}

/**
 * Parse + normalize the two sources and classify each row as
 * accepted/rejected/duplicate based purely on source content. Part 1 is
 * Markdown, part 2 is CSV; both are parsed with content-driven separator
 * detection (pipe or comma) for robustness.
 *
 * Rows carry their source-file label. Part 2 line numbers are remapped so
 * that every line number is unique within the combined batch
 * (`inventory_import_rows` enforces a `(batch_id, line_number)` unique
 * constraint); the physical source line is preserved via `sourceFile`.
 */
function parseAndClassify(part1: string, part2: string): ParsedSource {
  const part1Parsed = parseSource(part1).map((row) => ({
    ...row,
    sourceFile: STAR_INVENTORY_PART_1,
  }));
  const part2Parsed = parseSource(part2).map((row) => ({
    ...row,
    sourceFile: STAR_INVENTORY_PART_2,
  }));

  // Offset part 2 line numbers past the last part 1 line so the combined
  // batch has unique (batch_id, line_number) values.
  const part1MaxLine = part1Parsed.length > 0
    ? part1Parsed[part1Parsed.length - 1]?.lineNumber ?? 0
    : 0;
  const parsed = [
    ...part1Parsed,
    ...part2Parsed.map((row) => ({
      ...row,
      lineNumber: part1MaxLine + row.lineNumber,
    })),
  ];

  const rows = normalizeRows(parsed);

  const classification = new Map<NormalizedRow, RowClassification>();
  const seenCodes = new Set<string>();
  const seenDisplays = new Set<string>();

  let duplicateCount = 0;
  let rejectedCount = 0;

  for (const row of rows) {
    if (row.errors.length > 0) {
      classification.set(row, "rejected");
      rejectedCount += 1;
      continue;
    }

    const code = row.numberCode as string;
    const display = row.displayNumber as string;
    if (seenCodes.has(code) || seenDisplays.has(display)) {
      classification.set(row, "duplicate");
      duplicateCount += 1;
      continue;
    }
    seenCodes.add(code);
    seenDisplays.add(display);
    classification.set(row, "accepted");
  }

  const accepted = rows.filter((row) => classification.get(row) === "accepted");

  return { rows, classification, accepted, duplicateCount, rejectedCount };
}

/**
 * Compute missing codes within an expected range: codes that appear in the
 * expected range but have no source row. Only successfully normalized rows
 * count as present (rejected rows and duplicates are excluded).
 */
function computeMissingCodes(
  rows: NormalizedRow[],
  expectedStart?: string,
  expectedEnd?: string,
): string[] {
  if (!expectedStart || !expectedEnd) return [];

  const present = new Set<string>();
  for (const row of rows) {
    if (row.numberCode && row.errors.length === 0) {
      present.add(row.numberCode);
    }
  }

  const expected = enumerateCodeRange(expectedStart, expectedEnd);
  return expected.filter((code) => !present.has(code));
}

/**
 * Resolve the lifecycle/conflict outcome for one accepted row against the
 * current inventory. Applies docs/02 conflict policy:
 * - Unknown code: create.
 * - Same code, same category, same status: no-op (already present).
 * - Changed category while status is `available`: allow only with the explicit
 *   `allowCategoryUpdate` import flag (recorded as an update).
 * - Source says `available` while the database holds an advanced lifecycle
 *   status: no downgrade; conflict.
 * - Any other status mismatch: conflict (imports never transition lifecycle
 *   status; that is a domain-service responsibility).
 * Read-only with respect to `star_numbers`.
 */
async function resolveAcceptedRow(
  db: Db,
  row: NormalizedRow,
  allowCategoryUpdate: boolean,
): Promise<Resolution> {
  const code = row.numberCode as string;
  const starRepo = createStarNumberRepository(db);
  const existing = await starRepo.findByNumberCode(code);

  if (!existing) {
    return {
      row,
      result: "accepted",
      action: "created",
      errorCode: null,
      errorMessage: null,
    };
  }

  const sourceCategory = row.category as StarNumberCategory;
  const sourceStatus = row.status as StarNumberStatus;
  const sameStatus = existing.status === sourceStatus;
  const sameCategory = existing.category === sourceCategory;

  if (sameStatus && sameCategory) {
    return {
      row,
      result: "accepted",
      action: "already_present",
      errorCode: null,
      errorMessage: null,
    };
  }

  const existingAdvanced = ADVANCED_STATUSES.has(existing.status as StarNumberStatus);

  if (existingAdvanced && sourceStatus === "available") {
    return {
      row,
      result: "conflict",
      action: null,
      errorCode: "status_downgrade_protected",
      errorMessage: `Existing record ${code} is ${existing.status}; a stale source value ${sourceStatus} must not downgrade it.`,
    };
  }

  if (!sameStatus) {
    return {
      row,
      result: "conflict",
      action: null,
      errorCode: "status_conflict",
      errorMessage: `Existing record ${code} is ${existing.status}; imports do not transition lifecycle status to ${sourceStatus}.`,
    };
  }

  // Same status, category differs.
  if (allowCategoryUpdate && existing.status === "available") {
    return {
      row,
      result: "accepted",
      action: "updated",
      errorCode: null,
      errorMessage: null,
    };
  }

  return {
    row,
    result: "conflict",
    action: null,
    errorCode: "category_conflict",
    errorMessage: `Existing record ${code} category is ${existing.category}; source says ${sourceCategory}. Category updates require the explicit import update flag.`,
  };
}

/**
 * Run a star-number inventory import.
 *
 * DRY RUN: writes only the import batch and row outcomes; `star_numbers` is
 * never modified.
 *
 * COMMIT: additionally upserts `star_numbers` for accepted rows subject to the
 * conflict policy. If any row failed validation or is a within-source
 * duplicate (fatal validation errors), the batch is marked `failed` and no
 * inventory rows are written.
 */
export async function runInventoryImport(
  db: Db,
  options: InventoryImportOptions,
): Promise<InventoryImportResult> {
  if (!isImportBatchMode(options.mode)) {
    throw new InventoryImportError(
      "invalid_mode",
      `Invalid import mode "${String(options.mode)}" (expected "dry_run" or "commit").`,
    );
  }

  const sourceDir = options.sourceDir ?? DEFAULT_SOURCE_DIR;
  const { part1, part2 } = await readSources(sourceDir);
  const sourceHash = hashSources(part1, part2);

  const { rows, classification, accepted, duplicateCount, rejectedCount } =
    parseAndClassify(part1, part2);
  const missingCodes = computeMissingCodes(
    rows,
    options.expectedStart,
    options.expectedEnd,
  );

  const fatalValidationErrors = rejectedCount > 0 || duplicateCount > 0;

  const actorRepo = createActorRepository(db);
  const importsRepo = createInventoryImportRepository(db);
  const starRepo = createStarNumberRepository(db);

  const actor = await actorRepo.upsert({
    userId: options.actor.userId,
    organizationId: options.actor.organizationId,
  });

  const alreadyProcessed = options.mode === "commit"
    ? (await importsRepo.findBySourceHash(sourceHash)).some(
        (batch) => batch.mode === "commit" && batch.status === "completed",
      )
    : false;

  const batch = await importsRepo.createBatch({
    sourceName: `${STAR_INVENTORY_PART_1}, ${STAR_INVENTORY_PART_2}`,
    sourceHash,
    mode: options.mode,
    actorId: actor.id,
  });

  // Resolve accepted rows against the current inventory (read-only). In DRY
  // RUN nothing is written to star_numbers; in COMMIT the resolved actions are
  // applied below.
  const resolutions: Resolution[] = [];
  for (const row of accepted) {
    resolutions.push(await resolveAcceptedRow(db, row, options.allowCategoryUpdate ?? false));
  }
  const byRow = new Map(resolutions.map((resolution) => [resolution.row, resolution]));

  const rowRecords = rows.map((row) => {
    const classificationValue = classification.get(row) ?? "accepted";
    const resolution = byRow.get(row);

    if (classificationValue === "rejected") {
      return {
        lineNumber: row.lineNumber,
        rawValueJson: {
          sourceFile: row.sourceFile ?? "",
          lineNumber: row.lineNumber,
          source: row.raw,
          cells: row.originalCells,
        },
        normalizedValueJson: null,
        result: "rejected" as const,
        errorCode: row.errors[0]?.code ?? "invalid_row",
        errorMessage: row.errors
          .map((error) => `Line ${row.lineNumber}: ${error.message}`)
          .join(" "),
      };
    }

    if (classificationValue === "duplicate") {
      return {
        lineNumber: row.lineNumber,
        rawValueJson: {
          sourceFile: row.sourceFile ?? "",
          lineNumber: row.lineNumber,
          source: row.raw,
          cells: row.originalCells,
        },
        normalizedValueJson: null,
        result: "duplicate" as const,
        errorCode: "duplicate_number_code",
        errorMessage: `Line ${row.lineNumber}: number_code ${row.numberCode} appears more than once in the source.`,
      };
    }

    if (resolution?.result === "conflict") {
      return {
        lineNumber: row.lineNumber,
        rawValueJson: {
          sourceFile: row.sourceFile ?? "",
          lineNumber: row.lineNumber,
          source: row.raw,
          cells: row.originalCells,
        },
        normalizedValueJson: null,
        result: "conflict" as const,
        errorCode: resolution.errorCode,
        errorMessage: resolution.errorMessage,
      };
    }

    return {
      lineNumber: row.lineNumber,
      rawValueJson: {
          sourceFile: row.sourceFile ?? "",
          lineNumber: row.lineNumber,
          source: row.raw,
          cells: row.originalCells,
        },
      normalizedValueJson: {
        numberCode: row.numberCode,
        displayNumber: row.displayNumber,
        category: row.category,
        status: row.status,
        action: resolution?.action ?? null,
      },
      result: "accepted" as const,
      errorCode: null,
      errorMessage: null,
    };
  });

  const conflictCount = resolutions.filter((r) => r.result === "conflict").length;

  const summary: ImportBatchSummaryDetail = {
    accepted: accepted.length,
    rejected: rejectedCount,
    duplicate: duplicateCount,
    conflict: conflictCount,
    missing: missingCodes.length,
    missingCodes,
    total: rows.length,
    created: 0,
    updated: 0,
    alreadyPresent: 0,
    alreadyProcessed,
  };

  // Apply resolved actions only in COMMIT; never when fatal validation errors
  // exist. Dry runs never touch star_numbers.
  if (options.mode === "commit" && !fatalValidationErrors) {
    for (const resolution of resolutions) {
      if (resolution.result !== "accepted") continue;
      const row = resolution.row;
      if (resolution.action === "created") {
        await starRepo.createIfAbsent({
          numberCode: row.numberCode as string,
          category: row.category as StarNumberCategory,
          status: row.status as StarNumberStatus,
          sourceBatchId: batch.id,
        });
        summary.created += 1;
      } else if (resolution.action === "updated") {
        const existing = await starRepo.findByNumberCode(row.numberCode as string);
        if (existing) {
          await starRepo.updateCategory(existing.id, row.category as StarNumberCategory);
          summary.updated += 1;
        } else {
          // Race: record vanished between resolution and application.
          await starRepo.createIfAbsent({
            numberCode: row.numberCode as string,
            category: row.category as StarNumberCategory,
            status: row.status as StarNumberStatus,
            sourceBatchId: batch.id,
          });
          summary.created += 1;
        }
      } else {
        summary.alreadyPresent += 1;
      }
    }
  }

  const batchStatus: ImportBatchStatus =
    fatalValidationErrors && options.mode === "commit" ? "failed" : "completed";

  // Write row outcomes, then persist batch status + summary. Rows are written
  // even for failed commits so administrators can inspect every source line.
  await importsRepo.writeRows({ batchId: batch.id, rows: rowRecords });
  await importsRepo.setBatchSummary(batch.id, summary);
  await importsRepo.updateBatchStatus(batch.id, batchStatus);

  const committed = await importsRepo.findBatchById(batch.id);
  if (!committed) {
    throw new InventoryImportError("batch_not_found", "Import batch was not persisted.");
  }

  return { batch: committed, summary };
}