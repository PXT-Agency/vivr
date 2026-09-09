import { NextResponse } from "next/server";

import { requirePlatformAdminContext, platformAdminErrorResponse } from "@/server/auth";
import { createDatabase } from "@/server/db";
import { createInventoryImportRepository } from "@/server/repositories/inventory-imports";

export const dynamic = "force-dynamic";

/**
 * List recent import batches (most recent first). Gated on the
 * platform-administrator flag plus an active organization context.
 */
export async function GET() {
  try {
    await requirePlatformAdminContext();
  } catch (error) {
    return platformAdminErrorResponse(error);
  }

  const { client, db } = createDatabase();
  try {
    const batches = await createInventoryImportRepository(db).listBatches(50);
    return NextResponse.json({
      batches: batches.map((batch) => ({
        id: batch.id,
        mode: batch.mode,
        status: batch.status,
        sourceName: batch.sourceName,
        startedAt: batch.startedAt,
        completedAt: batch.completedAt,
        createdAt: batch.createdAt,
        actorId: batch.actorId,
        summary: batch.summaryJson,
      })),
    });
  } finally {
    await client.end();
  }
}