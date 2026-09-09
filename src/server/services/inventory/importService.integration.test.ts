import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { connectTestDatabase, resetDatabase, type TestDatabase } from "@/server/db/testing";
import { createOrganizationRepository } from "@/server/repositories/organizations";
import { createStarNumberRepository } from "@/server/repositories/star-numbers";
import { createInventoryImportRepository } from "@/server/repositories/inventory-imports";
import {
  STAR_INVENTORY_PART_1,
  STAR_INVENTORY_PART_2,
  runInventoryImport,
  type InventoryImportOptions,
} from "./importService";

const ACTOR = {
  userId: "user_import_admin",
  organizationId: "org_test_import",
};

function writeFixture(part1: string, part2: string): string {
  const dir = mkdtempSync(join(tmpdir(), "vivr-import-"));
  writeFileSync(join(dir, STAR_INVENTORY_PART_1), part1);
  writeFileSync(join(dir, STAR_INVENTORY_PART_2), part2);
  return dir;
}

const dirsToClean: string[] = [];

function track(dir: string): string {
  dirsToClean.push(dir);
  return dir;
}

const PART_1_HAPPY = [
  "| STAR NUMBER | STATUS | CATEGORY |",
  "|---|---|---|",
  "| *0001 | Available | Silver |",
  "| *0002 | Available | Gold |",
  "| *0004 | Available | Platinum |",
  "",
].join("\n");

const PART_2_HAPPY = [
  "# star-inventory-part-02.csv",
  "| STAR NUMBER | STATUS | CATEGORY |",
  "| --- | --- | --- |",
  "| *0005 | Available | Diamond |",
].join("\n");

let testDb: TestDatabase;
let starRepo: ReturnType<typeof createStarNumberRepository>;
let importsRepo: ReturnType<typeof createInventoryImportRepository>;

beforeAll(() => {
  testDb = connectTestDatabase();
  starRepo = createStarNumberRepository(testDb.db);
  importsRepo = createInventoryImportRepository(testDb.db);
});

beforeEach(async () => {
  await resetDatabase(testDb);
  await createOrganizationRepository(testDb.db).upsert({
    id: ACTOR.organizationId,
    name: "Import Test Org",
    slug: "import-test-org",
  });
});

afterAll(async () => {
  for (const dir of dirsToClean) {
    rmSync(dir, { recursive: true, force: true });
  }
  await testDb.close();
});

async function run(
  options: Partial<InventoryImportOptions> &
    Pick<InventoryImportOptions, "sourceDir" | "mode">,
) {
  return runInventoryImport(testDb.db, {
    ...options,
    actor: ACTOR,
  });
}

describe("runInventoryImport", () => {
  it("dry run records the batch and rows but never writes star_numbers", async () => {
    const dir = track(writeFixture(PART_1_HAPPY, PART_2_HAPPY));

    const { batch, summary } = await run({
      mode: "dry_run",
      sourceDir: dir,
      expectedStart: "0001",
      expectedEnd: "0006",
    });

    expect(batch.mode).toBe("dry_run");
    expect(batch.status).toBe("completed");

    expect(summary.accepted).toBe(4);
    expect(summary.rejected).toBe(0);
    expect(summary.duplicate).toBe(0);
    expect(summary.conflict).toBe(0);
    expect(summary.total).toBe(4);
    expect(summary.missing).toBe(2);
    expect(summary.missingCodes).toEqual(["0003", "0006"]);
    expect(summary.created).toBe(0);
    expect(summary.alreadyProcessed).toBe(false);

    const rows = await importsRepo.findRowsByBatch(batch.id);
    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.result === "accepted")).toBe(true);

    const starCount = await starRepo.count({});
    expect(starCount.total).toBe(0);
  });

  it("commit creates star_numbers preserving leading zeroes and deriving display_number", async () => {
    const dir = track(writeFixture(PART_1_HAPPY, PART_2_HAPPY));

    const { batch, summary } = await run({
      mode: "commit",
      sourceDir: dir,
      expectedStart: "0001",
      expectedEnd: "0006",
    });

    expect(batch.status).toBe("completed");
    expect(summary.created).toBe(4);
    expect(summary.updated).toBe(0);
    expect(summary.alreadyPresent).toBe(0);
    expect(summary.missingCodes).toEqual(["0003", "0006"]);

    const stars = await starRepo.list({ limit: 50 });
    expect(stars).toHaveLength(4);
    const first = stars.find((star) => star.numberCode === "0001");
    expect(first?.numberCode).toBe("0001");
    expect(first?.displayNumber).toBe("*0001");

    expect(await starRepo.findByNumberCode("0003")).toBeNull();
    expect(await starRepo.findByNumberCode("0006")).toBeNull();
  });

  it("commit is idempotent: re-running creates nothing new", async () => {
    const dir = track(writeFixture(PART_1_HAPPY, PART_2_HAPPY));

    await run({ mode: "commit", sourceDir: dir });

    const second = await run({ mode: "commit", sourceDir: dir, expectedStart: "0001", expectedEnd: "0006" });

    expect(second.batch.status).toBe("completed");
    expect(second.summary.created).toBe(0);
    expect(second.summary.alreadyPresent).toBe(4);
    expect(second.summary.alreadyProcessed).toBe(true);

    const starCount = await starRepo.count({});
    expect(starCount.total).toBe(4);
  });

  it("rejects rows with invalid values and fails the commit without writing star_numbers", async () => {
    const dir = track(writeFixture(
      [
        "| STAR NUMBER | STATUS | CATEGORY |",
        "|---|---|---|",
        "| *0001 | Available | Silver |",
        "| *0002 | Available | Bronze |",
      ].join("\n"),
      PART_2_HAPPY,
    ));

    const { batch, summary } = await run({
      mode: "commit",
      sourceDir: dir,
      expectedStart: "0001",
      expectedEnd: "0006",
    });

    expect(batch.status).toBe("failed");
    expect(summary.rejected).toBe(1);
    expect(summary.accepted).toBe(2);
    expect(summary.missingCodes).toEqual(["0002", "0003", "0004", "0006"]);

    const starCount = await starRepo.count({});
    expect(starCount.total).toBe(0);

    const rows = await importsRepo.findRowsByBatch(batch.id);
    const rejected = rows.find((row) => row.result === "rejected");
    expect(rejected?.errorCode).toBe("invalid_category");
    expect(rejected?.errorMessage).toContain("Bronze");
  });

  it("rejects within-source duplicate number codes and fails the commit", async () => {
    const dir = track(writeFixture(
      [
        "| STAR NUMBER | STATUS | CATEGORY |",
        "|---|---|---|",
        "| *0001 | Available | Silver |",
        "| *0001 | Available | Gold |",
      ].join("\n"),
      PART_2_HAPPY,
    ));

    const { batch, summary } = await run({ mode: "commit", sourceDir: dir });

    expect(batch.status).toBe("failed");
    expect(summary.duplicate).toBe(1);
    expect(summary.accepted).toBe(2);

    const starCount = await starRepo.count({});
    expect(starCount.total).toBe(0);
  });

  it("never downgrades a record held in an advanced lifecycle status", async () => {
    const dir = track(writeFixture(PART_1_HAPPY, PART_2_HAPPY));

    await run({ mode: "commit", sourceDir: dir });

    const sold = await starRepo.findByNumberCode("0001");
    expect(sold).not.toBeNull();
    if (!sold) throw new Error("expected 0001 to exist");
    await starRepo.setStatus(sold.id, "sold");

    const before = await starRepo.count({});
    const { summary } = await run({ mode: "dry_run", sourceDir: dir });

    const conflictRow = summary.conflict;
    expect(conflictRow).toBe(1);

    const rows = await importsRepo.listBatches(10);
    const latest = rows[0];
    const latestRows = latest ? await importsRepo.findRowsByBatch(latest.id) : [];
    const conflict = latestRows.find((row) => row.result === "conflict");
    expect(conflict?.errorCode).toBe("status_downgrade_protected");

    const after = await starRepo.count({});
    expect(after.total).toBe(before.total);
    expect((await starRepo.findByNumberCode("0001"))?.status).toBe("sold");
  });

  it("blocks category changes without the explicit update flag and honors it when set", async () => {
    const silverFixture = track(writeFixture(
      [
        "| STAR NUMBER | STATUS | CATEGORY |",
        "|---|---|---|",
        "| *0001 | Available | Silver |",
      ].join("\n"),
      PART_2_HAPPY,
    ));
    await run({ mode: "commit", sourceDir: silverFixture });

    const goldPart1 = [
      "| STAR NUMBER | STATUS | CATEGORY |",
      "|---|---|---|",
      "| *0001 | Available | Gold |",
    ].join("\n");
    const goldFixture = track(writeFixture(goldPart1, PART_2_HAPPY));

    const blocked = await run({ mode: "dry_run", sourceDir: goldFixture });
    expect(blocked.summary.conflict).toBe(1);
    expect((await starRepo.findByNumberCode("0001"))?.category).toBe("silver");

    const applied = await run({
      mode: "commit",
      sourceDir: goldFixture,
      allowCategoryUpdate: true,
    });
    expect(applied.summary.updated).toBe(1);
    expect(applied.summary.conflict).toBe(0);
    expect((await starRepo.findByNumberCode("0001"))?.category).toBe("gold");

    const applied2 = await run({ mode: "commit", sourceDir: goldFixture });
    expect(applied2.summary.alreadyPresent).toBe(2);
  });

  it("produces one deterministic batch and row records per run", async () => {
    const dir = track(writeFixture(PART_1_HAPPY, PART_2_HAPPY));

    const first = await run({ mode: "commit", sourceDir: dir });
    const second = await run({ mode: "commit", sourceDir: dir });

    expect(first.batch.id).not.toBe(second.batch.id);

    const rowsA = await importsRepo.findRowsByBatch(first.batch.id);
    const rowsB = await importsRepo.findRowsByBatch(second.batch.id);
    expect(rowsA).toHaveLength(rowsB.length);
    expect(rowsA.map((row) => row.lineNumber)).toEqual(rowsB.map((row) => row.lineNumber));
  });
});