import { notFound } from "next/navigation";
import { z } from "zod";

import { requirePlatformAdminContext } from "@/server/auth";
import {
  isImportBatchMode,
  isImportBatchStatus,
  isImportRowResult,
  isStarNumberCategory,
  isStarNumberStatus,
  type ImportBatchMode,
  type ImportBatchStatus,
  type ImportRowResult,
  type StarNumberCategory,
  type StarNumberStatus,
} from "@/config/starNumbers";
import { createDatabase } from "@/server/db";
import {
  createInventoryImportRepository,
  type ImportBatchSummaryDetail,
} from "@/server/repositories/inventory-imports";

export const ADMIN_BATCHES_PAGE_SIZE = 50;

const summarySchema = z.object({
  accepted: z.number().optional().default(0),
  rejected: z.number().optional().default(0),
  duplicate: z.number().optional().default(0),
  conflict: z.number().optional().default(0),
  missing: z.number().optional().default(0),
  total: z.number().optional().default(0),
  created: z.number().optional().default(0),
  updated: z.number().optional().default(0),
  alreadyPresent: z.number().optional().default(0),
  alreadyProcessed: z.boolean().optional().default(false),
  missingCodes: z.array(z.string()).optional().default([]),
});

function parseSummary(value: unknown): ImportBatchSummaryDetail {
  return summarySchema.parse(value);
}

const normalizedRowSchema = z.object({
  numberCode: z.string().nullable().optional(),
  displayNumber: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  action: z.string().nullable().optional(),
});

const rawRowSchema = z.object({
  sourceFile: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  cells: z.array(z.string()).nullable().optional(),
});

function parseRawRow(value: unknown): { sourceFile?: string; source?: string; cells: string[] } {
  const parsed = rawRowSchema.passthrough().safeParse(value);
  if (!parsed.success) return { cells: [] };
  return {
    sourceFile: parsed.data.sourceFile ?? undefined,
    source: parsed.data.source ?? undefined,
    cells: parsed.data.cells ?? [],
  };
}

export interface AdminImportBatchView {
  id: string;
  sourceName: string;
  mode: ImportBatchMode;
  status: ImportBatchStatus;
  summary: ImportBatchSummaryDetail;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
}

export interface AdminImportRowView {
  lineNumber: number;
  sourceFile: string | null;
  /** Display form when derivable, otherwise the raw source cell text. */
  number: string;
  category: StarNumberCategory | null;
  status: StarNumberStatus | null;
  result: ImportRowResult;
  errorCode: string | null;
  errorMessage: string | null;
  action: string | null;
}

export interface AdminImportBatchDetail {
  batch: AdminImportBatchView;
  rows: AdminImportRowView[];
}

/**
 * Platform-admin batch list. The operator context is required even though the
 * result carries no identifier: imports are platform operations and every
 * request fails closed unless the user is a platform administrator with an
 * active organization context.
 */
export async function getImportBatches(): Promise<AdminImportBatchView[]> {
  await requirePlatformAdminContext();

  const { client, db } = createDatabase();
  try {
    const importsRepo = createInventoryImportRepository(db);
    const batches = await importsRepo.listBatches(ADMIN_BATCHES_PAGE_SIZE);

    return batches.map((batch) => ({
      id: batch.id,
      sourceName: batch.sourceName,
      mode: (isImportBatchMode(batch.mode) ? batch.mode : "dry_run") as ImportBatchMode,
      status: (isImportBatchStatus(batch.status) ? batch.status : "failed") as ImportBatchStatus,
      summary: parseSummary(batch.summaryJson),
      startedAt: batch.startedAt,
      completedAt: batch.completedAt,
      createdAt: batch.createdAt,
    }));
  } finally {
    await client.end();
  }
}

/**
 * Platform-admin batch detail: batch metadata plus structured row outcomes.
 * Raw source values are surfaced through derived fields (number, category,
 * status, result, error) only — the original JSON blobs are never rendered.
 */
export async function getImportBatch(batchId: string): Promise<AdminImportBatchDetail> {
  await requirePlatformAdminContext();

  const { client, db } = createDatabase();
  try {
    const importsRepo = createInventoryImportRepository(db);

    const [batch, rowRecords] = await Promise.all([
      importsRepo.findBatchById(batchId),
      importsRepo.findRowsByBatch(batchId),
    ]);

    if (!batch) {
      notFound();
    }

    const rows: AdminImportRowView[] = rowRecords.map((row) => {
      const raw = parseRawRow(row.rawValueJson);
      const normalized = normalizedRowSchema.passthrough().safeParse(row.normalizedValueJson);

      let number = "";
      if (normalized.success && normalized.data.displayNumber) {
        number = normalized.data.displayNumber;
      } else if (normalized.success && normalized.data.numberCode) {
        number = `*${normalized.data.numberCode}`;
      } else if (raw.cells.length > 0) {
        number = raw.cells[0] ?? "";
      }

      const categoryValue =
        normalized.success && normalized.data.category
          ? normalized.data.category
          : raw.cells[2];
      const statusValue =
        normalized.success && normalized.data.status ? normalized.data.status : raw.cells[1];

      return {
        lineNumber: row.lineNumber,
        sourceFile: raw.sourceFile ?? null,
        number,
        category: isStarNumberCategory(categoryValue) ? categoryValue : null,
        status: isStarNumberStatus(statusValue) ? statusValue : null,
        result: isImportRowResult(row.result) ? row.result : "rejected",
        errorCode: row.errorCode,
        errorMessage: row.errorMessage,
        action: normalized.success ? (normalized.data.action ?? null) : null,
      };
    });

    return {
      batch: {
        id: batch.id,
        sourceName: batch.sourceName,
        mode: (isImportBatchMode(batch.mode) ? batch.mode : "dry_run") as ImportBatchMode,
        status: (isImportBatchStatus(batch.status) ? batch.status : "failed") as ImportBatchStatus,
        summary: parseSummary(batch.summaryJson),
        startedAt: batch.startedAt,
        completedAt: batch.completedAt,
        createdAt: batch.createdAt,
      },
      rows,
    };
  } finally {
    await client.end();
  }
}