import { NextResponse } from "next/server";

import { requirePlatformAdminContext, platformAdminErrorResponse } from "@/server/auth";
import { createDatabase } from "@/server/db";
import { createInventoryImportRepository } from "@/server/repositories/inventory-imports";

export const dynamic = "force-dynamic";

/**
 * Fetch one import batch with its row-level outcomes. Gated on the
 * platform-administrator flag plus an active organization context.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  try {
    await requirePlatformAdminContext();
  } catch (error) {
    return platformAdminErrorResponse(error);
  }

  const { batchId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(batchId)) {
    return NextResponse.json({ error: "invalid_batch_id" }, { status: 400 });
  }

  const { client, db } = createDatabase();
  try {
    const importsRepo = createInventoryImportRepository(db);
    const batch = await importsRepo.findBatchById(batchId);
    if (!batch) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const rows = await importsRepo.findRowsByBatch(batchId);
    return NextResponse.json({
      batch: {
        id: batch.id,
        mode: batch.mode,
        status: batch.status,
        sourceName: batch.sourceName,
        sourceHash: batch.sourceHash,
        startedAt: batch.startedAt,
        completedAt: batch.completedAt,
        createdAt: batch.createdAt,
        actorId: batch.actorId,
        summary: batch.summaryJson,
      },
      rows: rows.map((row) => ({
        id: row.id,
        lineNumber: row.lineNumber,
        rawValue: row.rawValueJson,
        normalizedValue: row.normalizedValueJson,
        result: row.result,
        errorCode: row.errorCode,
        errorMessage: row.errorMessage,
      })),
    });
  } finally {
    await client.end();
  }
}