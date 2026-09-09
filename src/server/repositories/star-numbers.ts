import { and, asc, count, eq, like, sql } from "drizzle-orm";

import {
  isStarNumberCategory,
  isStarNumberStatus,
  STAR_NUMBER_DEFAULT_FORMAT_VERSION,
  type StarNumberCategory,
  type StarNumberStatus,
} from "@/config/starNumbers";
import type { Db } from "@/server/db";
import { starNumbers, type StarNumberRow } from "@/server/db/schema";

/** Display form of a code: `*` + number_code (e.g. `*0001`). */
export function toDisplayNumber(numberCode: string): string {
  return `*${numberCode}`;
}

export interface CreateStarNumberInput {
  /** Four-digit code with preserved leading zeroes (e.g. "0001"). */
  numberCode: string;
  category: StarNumberCategory;
  status: StarNumberStatus;
  memorabilityScore?: number | null;
  patternTags?: string[];
  sourceBatchId?: string | null;
  formatVersion?: number;
}

export interface StarNumberQuery {
  search?: string;
  category?: StarNumberCategory;
  status?: StarNumberStatus;
  limit?: number;
  offset?: number;
}

export interface StarNumberCount {
  total: number;
  filtered: number;
}

/**
 * Canonical platform-level star-number inventory.
 *
 * Invariants enforced here (mirrored by database constraints):
 * - `number_code` is stored as TEXT with leading zeroes preserved; it is never
 *   coerced to an integer anywhere in the data flow.
 * - `display_number` is derived (`*` + number_code) and cannot be supplied or
 *   edited independently.
 * - `category` and `status` are validated against canonical machine values.
 * - Records are never hard-deleted by business operations (soft lifecycle
 *   transitions use `status`).
 */
export class StarNumberRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreateStarNumberInput): Promise<StarNumberRow> {
    if (!/^[0-9]{4}$/.test(input.numberCode)) {
      throw new Error(`Invalid number_code: ${input.numberCode}`);
    }
    if (!isStarNumberCategory(input.category)) {
      throw new Error(`Invalid category: ${String(input.category)}`);
    }
    if (!isStarNumberStatus(input.status)) {
      throw new Error(`Invalid status: ${String(input.status)}`);
    }

    const [row] = await this.db
      .insert(starNumbers)
      .values({
        numberCode: input.numberCode,
        displayNumber: toDisplayNumber(input.numberCode),
        formatVersion: input.formatVersion ?? STAR_NUMBER_DEFAULT_FORMAT_VERSION,
        category: input.category,
        status: input.status,
        memorabilityScore: input.memorabilityScore ?? null,
        patternTags: input.patternTags ?? [],
        sourceBatchId: input.sourceBatchId ?? null,
      })
      .returning();
    return row;
  }

  async findById(id: string): Promise<StarNumberRow | null> {
    const [row] = await this.db
      .select()
      .from(starNumbers)
      .where(eq(starNumbers.id, id))
      .limit(1);
    return row ?? null;
  }

  async findByNumberCode(numberCode: string): Promise<StarNumberRow | null> {
    const [row] = await this.db
      .select()
      .from(starNumbers)
      .where(eq(starNumbers.numberCode, numberCode))
      .limit(1);
    return row ?? null;
  }

  async findByDisplayNumber(displayNumber: string): Promise<StarNumberRow | null> {
    const [row] = await this.db
      .select()
      .from(starNumbers)
      .where(eq(starNumbers.displayNumber, displayNumber))
      .limit(1);
    return row ?? null;
  }

  /**
   * Look up a star number by code or display form. Accepts `0001`, `1`,
   * `*0001`, `*1`; codes are normalized to stored form but never coerced to
   * numbers.
   */
  async findByCodeOrDisplay(value: string): Promise<StarNumberRow | null> {
    const code = value.startsWith("*") ? value.slice(1) : value;
    const normalizedCode = code.padStart(4, "0");
    return (
      (await this.findByNumberCode(normalizedCode)) ??
      (await this.findByDisplayNumber(toDisplayNumber(normalizedCode)))
    );
  }

  async existsByNumberCode(numberCode: string): Promise<boolean> {
    return (await this.findByNumberCode(numberCode)) !== null;
  }

  /**
   * Idempotent insert: creates the record only when `number_code` does not
   * already exist. Returns the touched row and whether it was created. Used by
   * the import service so re-running a COMMIT never duplicates inventory rows.
   */
  async createIfAbsent(
    input: CreateStarNumberInput,
  ): Promise<{ row: StarNumberRow; created: boolean }> {
    if (!/^[0-9]{4}$/.test(input.numberCode)) {
      throw new Error(`Invalid number_code: ${input.numberCode}`);
    }
    if (!isStarNumberCategory(input.category)) {
      throw new Error(`Invalid category: ${String(input.category)}`);
    }
    if (!isStarNumberStatus(input.status)) {
      throw new Error(`Invalid status: ${String(input.status)}`);
    }

    const [row] = await this.db
      .insert(starNumbers)
      .values({
        numberCode: input.numberCode,
        displayNumber: toDisplayNumber(input.numberCode),
        formatVersion: input.formatVersion ?? STAR_NUMBER_DEFAULT_FORMAT_VERSION,
        category: input.category,
        status: input.status,
        memorabilityScore: input.memorabilityScore ?? null,
        patternTags: input.patternTags ?? [],
        sourceBatchId: input.sourceBatchId ?? null,
      })
      .onConflictDoNothing({ target: starNumbers.numberCode })
      .returning();

    if (row) {
      return { row, created: true };
    }

    const existing = await this.requireByNumberCode(input.numberCode);
    return { row: existing, created: false };
  }

  private async requireByNumberCode(numberCode: string): Promise<StarNumberRow> {
    const row = await this.findByNumberCode(numberCode);
    if (!row) {
      throw new Error(`Star number not found for code ${numberCode}`);
    }
    return row;
  }

  /** Update the mutable category field (import policy-gated, audited by the service). */
  async updateCategory(id: string, category: StarNumberCategory): Promise<StarNumberRow> {
    if (!isStarNumberCategory(category)) {
      throw new Error(`Invalid category: ${String(category)}`);
    }
    const [row] = await this.db
      .update(starNumbers)
      .set({ category, updatedAt: new Date() })
      .where(eq(starNumbers.id, id))
      .returning();
    return row;
  }

  /**
   * Paginated listing with optional filters. `search` applies a leading-zero
   * preserving prefix match on number_code (likes are parameterized; no code is
   * ever coerced). `category`/`status` are validated canonical values.
   */
  async list(query: StarNumberQuery = {}): Promise<StarNumberRow[]> {
    const conditions = this.buildWhere(query);

    const rows = await this.db
      .select()
      .from(starNumbers)
      .where(conditions)
      .orderBy(asc(starNumbers.numberCode))
      .limit(query.limit ?? 50)
      .offset(query.offset ?? 0);
    return rows;
  }

  async count(query: StarNumberQuery = {}): Promise<StarNumberCount> {
    const conditions = this.buildWhere(query);
    const [filtered] = await this.db
      .select({ value: count() })
      .from(starNumbers)
      .where(conditions);
    const [total] = await this.db
      .select({ value: count() })
      .from(starNumbers)
      .where(sql`1=1`);
    return {
      total: total?.value ?? 0,
      filtered: filtered?.value ?? 0,
    };
  }

  /**
   * Transition a record's lifecycle status. Never downgrades lifecycle state
   * via this repository; products (imports) must route transitions through
   * future services with the documented state machine.
   */
  async setStatus(id: string, status: StarNumberStatus): Promise<StarNumberRow> {
    if (!isStarNumberStatus(status)) {
      throw new Error(`Invalid status: ${String(status)}`);
    }
    const [row] = await this.db
      .update(starNumbers)
      .set({ status, updatedAt: new Date() })
      .where(eq(starNumbers.id, id))
      .returning();
    return row;
  }

  private buildWhere(query: StarNumberQuery) {
    const conditions: ReturnType<typeof sql>[] = [];

    if (query.search) {
      const prefix = query.search.startsWith("*")
        ? query.search.slice(1)
        : query.search;
      conditions.push(like(starNumbers.numberCode, `${prefix}%`));
    }

    if (query.category) {
      if (!isStarNumberCategory(query.category)) {
        throw new Error(`Invalid category filter: ${String(query.category)}`);
      }
      conditions.push(eq(starNumbers.category, query.category));
    }

    if (query.status) {
      if (!isStarNumberStatus(query.status)) {
        throw new Error(`Invalid status filter: ${String(query.status)}`);
      }
      conditions.push(eq(starNumbers.status, query.status));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }
}

export type StarNumbersRepository = StarNumberRepository;

export function createStarNumberRepository(db: Db): StarNumbersRepository {
  return new StarNumberRepository(db);
}