"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ORGANIZATION_EDITOR_ROLES } from "@/config/auth";
import { createActorRepository } from "@/server/repositories/actors";
import { requireOrganizationRole } from "@/server/auth";
import { createDatabase, type Db } from "@/server/db";
import { createVivrService } from "@/server/services/vivr/vivrService";

/**
 * Server actions for the one-page VIVR builder (docs/04).
 *
 * Every mutation requires an `org:editor`/`org:admin` membership
 * (`requireOrganizationRole` against {@link ORGANIZATION_EDITOR_ROLES});
 * the `org:member` role renders read-only. The tenant boundary is always the
 * session-derived organization — never a value supplied by the browser.
 *
 * Actions return plain `ActionResult` objects instead of throwing so client
 * components can render inline field errors. Paths are revalidated so the
 * builder page (and its shared-runtime preview) reflects the last save.
 */

export interface ActionResult {
  ok: boolean;
  error?: string;
  vivrId?: string;
}

async function requireEditorContext() {
  return requireOrganizationRole([...ORGANIZATION_EDITOR_ROLES]);
}

function errorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Invalid input.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong.";
}

async function withDatabase<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const { client, db } = createDatabase();
  try {
    return await fn(db);
  } finally {
    await client.end();
  }
}

function builderPath(vivrId: string): string {
  return `/dashboard/vivr/${vivrId}`;
}

export async function createVivr(formData: FormData): Promise<ActionResult> {
  try {
    const context = await requireEditorContext();
    return await withDatabase(async (db) => {
      const service = createVivrService(db);
      const created = await service.createVivr(context.organizationId, {
        title: valueOf(formData, "title"),
        slug: valueOf(formData, "slug"),
        description: valueOf(formData, "description"),
        brandColor: valueOf(formData, "brandColor") || undefined,
        themeMode: valueOf(formData, "themeMode") || undefined,
        logoImageUrl: valueOf(formData, "logoImageUrl") || undefined,
        coverImageUrl: valueOf(formData, "coverImageUrl") || undefined,
      });
      revalidatePath("/dashboard/vivr");
      return { ok: true, vivrId: created.vivr.id };
    });
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function updateVivrProperties(
  vivrId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const context = await requireEditorContext();
    await withDatabase(async (db) => {
      const service = createVivrService(db);
      await service.updateCoreProperties(context.organizationId, vivrId, {
        title: valueOf(formData, "title"),
        slug: valueOf(formData, "slug"),
        description: valueOf(formData, "description"),
        brandColor: valueOf(formData, "brandColor") || undefined,
        themeMode: valueOf(formData, "themeMode") || undefined,
        logoImageUrl: valueOf(formData, "logoImageUrl") || undefined,
        coverImageUrl: valueOf(formData, "coverImageUrl") || undefined,
      });
    });
    revalidatePath(builderPath(vivrId));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function addBlock(
  vivrId: string,
  input: { type: string; title: string; config: unknown },
): Promise<ActionResult> {
  try {
    const context = await requireEditorContext();
    await withDatabase(async (db) => {
      const service = createVivrService(db);
      await service.addBlock(context.organizationId, vivrId, input);
    });
    revalidatePath(builderPath(vivrId));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function updateBlock(
  vivrId: string,
  blockId: string,
  patch: { title?: string; config?: unknown; enabled?: boolean },
): Promise<ActionResult> {
  try {
    const context = await requireEditorContext();
    await withDatabase(async (db) => {
      const service = createVivrService(db);
      await service.updateBlock(context.organizationId, vivrId, blockId, patch);
    });
    revalidatePath(builderPath(vivrId));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function removeBlock(
  vivrId: string,
  blockId: string,
): Promise<ActionResult> {
  try {
    const context = await requireEditorContext();
    await withDatabase(async (db) => {
      const service = createVivrService(db);
      await service.removeBlock(context.organizationId, vivrId, blockId);
    });
    revalidatePath(builderPath(vivrId));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function moveBlock(
  vivrId: string,
  blockId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  try {
    const context = await requireEditorContext();
    await withDatabase(async (db) => {
      const service = createVivrService(db);
      await service.moveBlock(context.organizationId, vivrId, blockId, direction);
    });
    revalidatePath(builderPath(vivrId));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function duplicateBlock(
  vivrId: string,
  blockId: string,
): Promise<ActionResult> {
  try {
    const context = await requireEditorContext();
    await withDatabase(async (db) => {
      const service = createVivrService(db);
      await service.duplicateBlock(context.organizationId, vivrId, blockId);
    });
    revalidatePath(builderPath(vivrId));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function toggleBlock(
  vivrId: string,
  blockId: string,
  enabled: boolean,
): Promise<ActionResult> {
  try {
    const context = await requireEditorContext();
    await withDatabase(async (db) => {
      const service = createVivrService(db);
      await service.setBlockEnabled(context.organizationId, vivrId, blockId, enabled);
    });
    revalidatePath(builderPath(vivrId));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function publishVivr(vivrId: string): Promise<ActionResult> {
  try {
    const context = await requireEditorContext();
    await withDatabase(async (db) => {
      const actor = await createActorRepository(db).upsert({
        userId: context.userId,
        organizationId: context.organizationId,
      });
      const service = createVivrService(db);
      await service.publish(context.organizationId, vivrId, actor.id);
    });
    revalidatePath(builderPath(vivrId));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function rollbackVivr(
  vivrId: string,
  versionId: string,
): Promise<ActionResult> {
  try {
    const context = await requireEditorContext();
    await withDatabase(async (db) => {
      const service = createVivrService(db);
      await service.rollback(context.organizationId, vivrId, versionId);
    });
    revalidatePath(builderPath(vivrId));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

function valueOf(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}