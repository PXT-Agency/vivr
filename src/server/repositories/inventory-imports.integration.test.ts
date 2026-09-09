import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createActorRepository } from "@/server/repositories/actors";
import {
  createInventoryImportRepository,
  type WriteImportRowsInput,
} from "@/server/repositories/inventory-imports";
import { createOrganizationRepository } from "@/server/repositories/organizations";
import { createStarNumberRepository } from "@/server/repositories/star-numbers";
import {
  connectTestDatabase,
  resetDatabase,
  type TestDatabase,
} from "@/server/db/testing";

let testDb: TestDatabase;
let organizations: ReturnType<typeof createOrganizationRepository>;
let actors: ReturnType<typeof createActorRepository>;
let imports: ReturnType<typeof createInventoryImportRepository>;
let starNumbers: ReturnType<typeof createStarNumberRepository>;

beforeAll(() => {
  testDb = connectTestDatabase();
  organizations = createOrganizationRepository(testDb.db);
  actors = createActorRepository(testDb.db);
  imports = createInventoryImportRepository(testDb.db);
  starNumbers = createStarNumberRepository(testDb.db);
});

beforeEach(async () => {
  await resetDatabase(testDb);
});

afterAll(async () => {
  await testDb.close();
});

async function seedActor(orgId = "org_test"): Promise<string> {
  await organizations.upsert({
    id: orgId,
    name: "Test Org",
    slug: `test-org-${orgId}`,
  });
  const actor = await actors.upsert({ userId: "user_x", organizationId: orgId });
  return actor.id;
}

describe("organization repository", () => {
  it("upserts and mirrors the app-side tenant record", async () => {
    const first = await organizations.upsert({
      id: "org_1",
      name: "Acme",
      slug: "acme",
    });
    expect(first.id).toBe("org_1");

    await organizations.upsert({ id: "org_1", name: "Acme Corp", slug: "acme" });
    const refreshed = await organizations.findById("org_1");
    expect(refreshed?.name).toBe("Acme Corp");

    expect((await organizations.findBySlug("acme"))?.name).toBe("Acme Corp");
  });

  it("rejects duplicate slugs across organizations", async () => {
    await organizations.upsert({ id: "org_1", name: "Acme", slug: "acme" });
    await expect(
      organizations.upsert({ id: "org_2", name: "Beta", slug: "acme" }),
    ).rejects.toThrow();
  });
});

describe("actor repository", () => {
  it("creates a unique user+organization actor", async () => {
    const actorId = await seedActor("org_alpha");
    const same = await actors.findByUserAndOrganization("user_x", "org_alpha");
    expect(same?.id).toBe(actorId);
  });

  it("upsert is idempotent over the (user, organization) pair", async () => {
    await seedActor("org_alpha");
    const again = await seedActor("org_alpha");
    const second = await actors.findByUserAndOrganization("user_x", "org_alpha");
    expect(again).toBe(second?.id);
  });

  it("scopes actors by organization", async () => {
    await seedActor("org_alpha");
    await seedActor("org_beta");
    const list = await actors.listByOrganization("org_alpha");
    expect(list).toHaveLength(1);
    expect(list[0].organizationId).toBe("org_alpha");
  });
});

describe("inventory import repository", () => {
  it("creates a batch and records row-level outcomes", async () => {
    const actorId = await seedActor();

    const batch = await imports.createBatch({
      sourceName: "star-inventory-part-01",
      sourceHash: "sha256:abc123",
      mode: "commit",
      actorId,
    });
    expect(batch.status).toBe("started");
    expect(batch.mode).toBe("commit");
    expect(batch.actorId).toBe(actorId);

    await imports.writeRows({
      batchId: batch.id,
      rows: [
        {
          lineNumber: 1,
          rawValueJson: { code: "0001", status: "available" },
          result: "accepted",
        },
        {
          lineNumber: 2,
          rawValueJson: { code: "0002" },
          normalizedValueJson: { code: "0002", status: "available" },
          result: "accepted",
        },
        {
          lineNumber: 3,
          rawValueJson: { code: "12a" },
          result: "rejected",
          errorCode: "invalid_code",
          errorMessage: "expected 4-digit code",
        },
      ],
    } satisfies WriteImportRowsInput);

    const rows = await imports.findRowsByBatch(batch.id);
    expect(rows).toHaveLength(3);
    expect(rows[0].result).toBe("accepted");
    expect(rows[1].normalizedValueJson).toEqual({
      code: "0002",
      status: "available",
    });
    expect(rows[2].errorCode).toBe("invalid_code");
    expect(rows[2].errorMessage).toBe("expected 4-digit code");

    const byLine = await imports.findRowByBatchAndLine(batch.id, 3);
    expect(byLine?.result).toBe("rejected");
    expect(await imports.countRowsByBatch(batch.id)).toBe(3);
  });

  it("tracks dry_run vs commit modes and completion status", async () => {
    const actorId = await seedActor();

    const dry = await imports.createBatch({
      sourceName: "s1",
      sourceHash: "hash-1",
      mode: "dry_run",
      actorId,
    });
    expect(dry.mode).toBe("dry_run");
    expect(dry.completedAt).toBeNull();

    await imports.updateBatchStatus(dry.id, "completed");
    const done = await imports.findBatchById(dry.id);
    expect(done?.status).toBe("completed");
    expect(done?.completedAt).not.toBeNull();
  });

  it("allows multiple batches to share a source hash (dry run + commit)", async () => {
    const actorId = await seedActor();
    await imports.createBatch({
      sourceName: "s1",
      sourceHash: "same-hash",
      mode: "dry_run",
      actorId,
    });
    await imports.createBatch({
      sourceName: "s1",
      sourceHash: "same-hash",
      mode: "commit",
      actorId,
    });

    const found = await imports.findBySourceHash("same-hash");
    expect(found).toHaveLength(2);
  });

  it("rejects out-of-canonical mode values", async () => {
    const actorId = await seedActor();
    await expect(
      imports.createBatch({
        sourceName: "s1",
        sourceHash: "h",
        mode: "upload" as never,
        actorId,
      }),
    ).rejects.toThrow();
  });

  it("links star numbers back to their source batch", async () => {
    const actorId = await seedActor();
    const batch = await imports.createBatch({
      sourceName: "s1",
      sourceHash: "h-link",
      mode: "commit",
      actorId,
    });

    const star = await starNumbers.create({
      numberCode: "0555",
      category: "platinum",
      status: "available",
      sourceBatchId: batch.id,
    });

    const found = await starNumbers.findById(star.id);
    expect(found?.sourceBatchId).toBe(batch.id);
  });

  it("records batch summaries as JSON", async () => {
    const actorId = await seedActor();
    const batch = await imports.createBatch({
      sourceName: "s1",
      sourceHash: "h-summary",
      mode: "commit",
      actorId,
    });

    const summary = { accepted: 2, rejected: 1, duplicate: 0, missing: 0, conflict: 0, total: 3 };
    await imports.setBatchSummary(batch.id, summary);

    const persisted = await imports.findBatchById(batch.id);
    expect(persisted?.summaryJson).toEqual(summary);
  });
});