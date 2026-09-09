import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePlatformAdminContext, platformAdminErrorResponse } from "@/server/auth";
import { createDatabase } from "@/server/db";
import {
  InventoryImportError,
  runInventoryImport,
} from "@/server/services/inventory/importService";
import { isImportBatchMode } from "@/config/starNumbers";

export const dynamic = "force-dynamic";

const importRequestSchema = z.object({
  mode: z.string().optional(),
  expectedStart: z.string().optional(),
  expectedEnd: z.string().optional(),
  allowCategoryUpdate: z.boolean().optional(),
});

/**
 * Run a star-number inventory import (dry_run or commit).
 *
 * Gated on the platform-administrator public-metadata flag plus an active
 * organization context (used to record the auditing actor). Source file paths
 * are fixed server-side defaults and are never accepted from the request.
 */
export async function POST(request: Request) {
  let admin: { userId: string; organizationId: string };
  try {
    admin = await requirePlatformAdminContext();
  } catch (error) {
    return platformAdminErrorResponse(error);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = importRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { mode, expectedStart, expectedEnd, allowCategoryUpdate } = parsed.data;
  const effectiveMode = mode ?? "dry_run";
  if (!isImportBatchMode(effectiveMode)) {
    return NextResponse.json(
      { error: "invalid_mode", message: `Invalid import mode "${mode}".` },
      { status: 400 },
    );
  }

  const { client, db } = createDatabase();
  try {
    const result = await runInventoryImport(db, {
      mode: effectiveMode,
      expectedStart,
      expectedEnd,
      allowCategoryUpdate: allowCategoryUpdate ?? false,
      actor: { userId: admin.userId, organizationId: admin.organizationId },
    });

    return NextResponse.json({
      batch: {
        id: result.batch.id,
        mode: result.batch.mode,
        status: result.batch.status,
        createdAt: result.batch.createdAt,
        completedAt: result.batch.completedAt,
      },
      summary: result.summary,
    });
  } catch (error) {
    if (error instanceof InventoryImportError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 400 },
      );
    }
    throw error;
  } finally {
    await client.end();
  }
}