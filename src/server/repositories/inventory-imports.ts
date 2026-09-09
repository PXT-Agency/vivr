import { and, eq, sql } from "drizzle-orm";

import {
  isImportBatchMode,
  isImportBatchStatus,
  type ImportBatchMode,
  type ImportBatchStatus,
  type ImportRowResult,
} from "@/config/starNumbers";
import type { JsonValue } from "@/types";
import type { ActorId } from "@/types";
import type { Db } from "@/server/db";
import {
  inventoryImportBatches,
  inventoryImportRows,
  type InventoryImportBatchRow,
  type InventoryImportRowRow,
  type NewInventoryImportRowRow,
} from "@/server/db/schema";

export interface CreateImportBatchInput {
  sourceName: string;
  sourceHash: string;
  mode: ImportBatchMode;
  actorId: ActorId;
}

export interface WriteImportRowsInput {
  batchId: string;
  rows: Array<{
    lineNumber: number;
    rawValueJson: JsonValue;
    normalizedValueJson?: JsonValue | null;
    result: ImportRowResult;
    errorCode?: string | null;
    errorMessage?: string | null;
  }>;
}

export interface ImportBatchSummary {
  accepted: number;
  rejected: number;
  duplicate: number;
  missing: number;
  conflict: number;
  total: number;
}

/** Extended operational summary persisted to `summary_json` by the import service. */
export interface ImportBatchSummaryDetail extends ImportBatchSummary {
  created: number;
  updated: number;
  alreadyPresent: number;
  missingCodes: string[];
  alreadyProcessed: boolean;
}

/**
 * Star-number inventory import batches and their row-level outcomes.
 *
 * Batches are platform operations (imports are executed by operators, not
 * inside an organization tenant boundary). `source_hash` identifies repeated
 * sources; the batch records who ran it via `actor_id`. Rows preserve the raw
 * source values so failures are auditable without re-parsing the source.
 */
export class InventoryImportRepository {
  constructor(private readonly db: Db) {}

  async createBatch(input: CreateImportBatchInput): Promise<InventoryImportBatchRow> {
    if (!isImportBatchMode(input.mode)) {
      throw new Error(`Invalid import mode: ${String(input.mode)}`);
    }
    const [row] = await this.db
      .insert(inventoryImportBatches)
      .values({
        sourceName: input.sourceName,
        sourceHash: input.sourceHash,
        mode: input.mode,
        status: "started",
        summaryJson: {},
        actorId: input.actorId,
      })
      .returning();
    return row;
  }

  async findBatchById(id: string): Promise<InventoryImportBatchRow | null> {
    const [row] = await this.db
      .select()
      .from(inventoryImportBatches)
      .where(eq(inventoryImportBatches.id, id))
      .limit(1);
    return row ?? null;
  }

  async findBySourceHash(sourceHash: string): Promise<InventoryImportBatchRow[]> {
    return this.db
      .select()
      .from(inventoryImportBatches)
      .where(eq(inventoryImportBatches.sourceHash, sourceHash));
  }

  async updateBatchStatus(id: string, status: ImportBatchStatus): Promise<void> {
    if (!isImportBatchStatus(status)) {
      throw new Error(`Invalid import batch status: ${String(status)}`);
    }
    await this.db
      .update(inventoryImportBatches)
      .set({
        status,
        completedAt: status === "completed" || status === "failed" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(inventoryImportBatches.id, id));
  }

  async setBatchSummary(
    id: string,
    summary: ImportBatchSummary | ImportBatchSummaryDetail,
  ): Promise<void> {
    await this.db
      .update(inventoryImportBatches)
      .set({ summaryJson: summary as unknown as JsonValue, updatedAt: new Date() })
      .where(eq(inventoryImportBatches.id, id));
  }

  /** Insert row-level outcomes for a batch. */
  async writeRows(input: WriteImportRowsInput): Promise<InventoryImportRowRow[]> {
    const values: NewInventoryImportRowRow[] = input.rows.map((row) => ({
      batchId: input.batchId,
      lineNumber: row.lineNumber,
      rawValueJson: row.rawValueJson,
      normalizedValueJson: row.normalizedValueJson ?? null,
      result: row.result,
      errorCode: row.errorCode ?? null,
      errorMessage: row.errorMessage ?? null,
    }));
    return this.db.insert(inventoryImportRows).values(values).returning();
  }

  async findRowsByBatch(batchId: string): Promise<InventoryImportRowRow[]> {
    return this.db
      .select()
      .from(inventoryImportRows)
      .where(eq(inventoryImportRows.batchId, batchId))
      .orderBy(sql`${inventoryImportRows.lineNumber} asc`);
  }

  async findRowByBatchAndLine(batchId: string, lineNumber: number): Promise<InventoryImportRowRow | null> {
    const [row] = await this.db
      .select()
      .from(inventoryImportRows)
      .where(
        and(
          eq(inventoryImportRows.batchId, batchId),
          eq(inventoryImportRows.lineNumber, lineNumber),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async countRowsByBatch(batchId: string): Promise<number> {
    const [result] = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(inventoryImportRows)
      .where(eq(inventoryImportRows.batchId, batchId));
    return result?.value ?? 0;
  }

  /** Most recent batches first, newest at top. */
  async listBatches(limit = 20): Promise<InventoryImportBatchRow[]> {
    return this.db
      .select()
      .from(inventoryImportBatches)
      .orderBy(sql`${inventoryImportBatches.createdAt} desc`)
      .limit(limit);
  }
}

export type InventoryImportsRepository = InventoryImportRepository;

export function createInventoryImportRepository(db: Db): InventoryImportsRepository {
  return new InventoryImportRepository(db);
}