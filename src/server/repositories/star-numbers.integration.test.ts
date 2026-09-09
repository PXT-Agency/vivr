import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createStarNumberRepository } from "@/server/repositories/star-numbers";
import {
  connectTestDatabase,
  resetDatabase,
  type TestDatabase,
} from "@/server/db/testing";

let testDb: TestDatabase;
let repo: ReturnType<typeof createStarNumberRepository>;

beforeAll(() => {
  testDb = connectTestDatabase();
  repo = createStarNumberRepository(testDb.db);
});

beforeEach(async () => {
  await resetDatabase(testDb);
});

afterAll(async () => {
  await testDb.close();
});

describe("star number repository", () => {
  it("creates a record and derives display_number from number_code", async () => {
    const row = await repo.create({
      numberCode: "0001",
      category: "silver",
      status: "available",
    });

    expect(row.numberCode).toBe("0001");
    expect(row.displayNumber).toBe("*0001");
    expect(row.formatVersion).toBe(1);
    expect(row.memorabilityScore).toBeNull();
    expect(row.patternTags).toEqual([]);
  });

  it("preserves leading zeroes end-to-end", async () => {
    const row = await repo.create({
      numberCode: "0007",
      category: "silver",
      status: "available",
    });

    const fromCode = await repo.findByNumberCode("0007");
    const fromDisplay = await repo.findByDisplayNumber("*0007");

    expect(fromCode?.numberCode).toBe("0007");
    expect(fromCode?.displayNumber).toBe("*0007");
    expect(fromDisplay?.id).toBe(row.id);
    // Equality on the stored text, never on a coerced integer.
    expect("" + Number(row.numberCode)).not.toBe(row.numberCode);
  });

  it("enforces global uniqueness of number_code and display_number", async () => {
    await repo.create({ numberCode: "0100", category: "gold", status: "available" });

    await expect(
      repo.create({ numberCode: "0100", category: "gold", status: "available" }),
    ).rejects.toThrow();

    // display_number collision must also be rejected (derived from code).
    await expect(
      repo.create({ numberCode: "0100", category: "gold", status: "available" }),
    ).rejects.toThrow();
  });

  it("rejects invalid number codes, categories, and statuses", async () => {
    await expect(
      repo.create({ numberCode: "12", category: "silver", status: "available" }),
    ).rejects.toThrow("Invalid number_code");

    await expect(
      repo.create({
        numberCode: "9999",
        category: "bronze" as never,
        status: "available",
      }),
    ).rejects.toThrow("Invalid category");

    await expect(
      repo.create({
        numberCode: "9999",
        category: "silver",
        status: "archived" as never,
      }),
    ).rejects.toThrow("Invalid status");
  });

  it("looks up by code or display form without coercing values", async () => {
    await repo.create({ numberCode: "0023", category: "platinum", status: "reserved" });

    expect((await repo.findByCodeOrDisplay("0023"))?.numberCode).toBe("0023");
    expect((await repo.findByCodeOrDisplay("*0023"))?.numberCode).toBe("0023");
    expect((await repo.findByCodeOrDisplay("*23"))?.numberCode).toBe("0023");
    expect(await repo.findByCodeOrDisplay("*9999")).toBeNull();
  });

  it("lists with pagination and preserves leading-zero ordering", async () => {
    await repo.create({ numberCode: "0001", category: "silver", status: "available" });
    await repo.create({ numberCode: "0100", category: "gold", status: "available" });
    await repo.create({ numberCode: "1000", category: "diamond", status: "available" });
    await repo.create({ numberCode: "2000", category: "platinum", status: "sold" });

    const rows = await repo.list({ limit: 10, offset: 0 });
    expect(rows.map((r) => r.numberCode)).toEqual(["0001", "0100", "1000", "2000"]);
  });

  it("searches by prefix without stripping leading zeroes", async () => {
    await repo.create({ numberCode: "0001", category: "silver", status: "available" });
    await repo.create({ numberCode: "0002", category: "silver", status: "available" });
    await repo.create({ numberCode: "0100", category: "gold", status: "available" });

    const found = await repo.list({ search: "0", limit: 50 });
    expect(found.map((r) => r.numberCode)).toEqual(["0001", "0002", "0100"]);
  });

  it("filters by category and status", async () => {
    await repo.create({ numberCode: "0001", category: "silver", status: "available" });
    await repo.create({ numberCode: "0002", category: "gold", status: "available" });
    await repo.create({ numberCode: "0003", category: "gold", status: "sold" });

    const gold = await repo.list({ category: "gold", limit: 50 });
    expect(gold.map((r) => r.numberCode)).toEqual(["0002", "0003"]);

    const soldGold = await repo.list({ category: "gold", status: "sold", limit: 50 });
    expect(soldGold.map((r) => r.numberCode)).toEqual(["0003"]);
  });

  it("counts total and filtered rows", async () => {
    await repo.create({ numberCode: "0001", category: "silver", status: "available" });
    await repo.create({ numberCode: "0002", category: "gold", status: "available" });

    const counts = await repo.count({});
    expect(counts.total).toBe(2);
    expect(counts.filtered).toBe(2);

    const gold = await repo.count({ category: "gold" });
    expect(gold.filtered).toBe(1);
  });

  it("transitions lifecycle status without deleting the record", async () => {
    const row = await repo.create({
      numberCode: "0042",
      category: "diamond",
      status: "available",
    });

    const updated = await repo.setStatus(row.id, "sold");
    expect(updated.status).toBe("sold");

    const persisted = await repo.findById(row.id);
    expect(persisted?.status).toBe("sold");
  });
});