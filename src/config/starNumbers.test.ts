import { describe, expect, it } from "vitest";

import {
  IMPORT_BATCH_MODES,
  IMPORT_BATCH_STATUSES,
  IMPORT_ROW_RESULTS,
  isImportBatchMode,
  isImportBatchStatus,
  isImportRowResult,
  isStarNumberCategory,
  isStarNumberStatus,
  STAR_NUMBER_CATEGORIES,
  STAR_NUMBER_CODE_PATTERN,
  STAR_NUMBER_STATUSES,
} from "./starNumbers";

describe("star number configuration", () => {
  it("defines the canonical category set from the phase specification", () => {
    expect(STAR_NUMBER_CATEGORIES).toEqual([
      "silver",
      "gold",
      "platinum",
      "diamond",
    ]);
  });

  it("defines the canonical lifecycle status set", () => {
    expect(STAR_NUMBER_STATUSES).toEqual([
      "available",
      "reserved",
      "sold",
      "suspended",
      "released",
      "retired",
    ]);
  });

  it("defines the four-digit code pattern with significant leading zeroes", () => {
    expect(STAR_NUMBER_CODE_PATTERN.test("0001")).toBe(true);
    expect(STAR_NUMBER_CODE_PATTERN.test("1234")).toBe(true);
    expect(STAR_NUMBER_CODE_PATTERN.test("0000")).toBe(true);
    expect(STAR_NUMBER_CODE_PATTERN.test("123")).toBe(false);
    expect(STAR_NUMBER_CODE_PATTERN.test("12345")).toBe(false);
    expect(STAR_NUMBER_CODE_PATTERN.test("12a4")).toBe(false);
    expect(STAR_NUMBER_CODE_PATTERN.test("1.23")).toBe(false);
  });

  it("recognizes canonical categories and rejects unknown values", () => {
    for (const value of STAR_NUMBER_CATEGORIES) {
      expect(isStarNumberCategory(value)).toBe(true);
    }
    expect(isStarNumberCategory("bronze")).toBe(false);
    expect(isStarNumberCategory(null)).toBe(false);
    expect(isStarNumberCategory(42)).toBe(false);
  });

  it("recognizes canonical statuses and rejects unknown values", () => {
    for (const value of STAR_NUMBER_STATUSES) {
      expect(isStarNumberStatus(value)).toBe(true);
    }
    expect(isStarNumberStatus("archived")).toBe(false);
    expect(isStarNumberStatus(null)).toBe(false);
  });

  it("keeps import lifecycle values canonical and validated", () => {
    expect(IMPORT_BATCH_MODES).toEqual(["dry_run", "commit"]);
    expect(IMPORT_BATCH_STATUSES).toEqual(["started", "completed", "failed"]);
    expect(IMPORT_ROW_RESULTS).toEqual([
      "accepted",
      "rejected",
      "duplicate",
      "missing",
      "conflict",
    ]);

    expect(isImportBatchMode("commit")).toBe(true);
    expect(isImportBatchMode("dry_run")).toBe(true);
    expect(isImportBatchMode("import")).toBe(false);

    expect(isImportBatchStatus("started")).toBe(true);
    expect(isImportBatchStatus("paused")).toBe(false);

    expect(isImportRowResult("accepted")).toBe(true);
    expect(isImportRowResult("skipped")).toBe(false);
  });
});