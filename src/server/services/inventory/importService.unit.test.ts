import { describe, expect, it } from "vitest";

import { enumerateCodeRange, InventoryImportError } from "./importService";

describe("enumerateCodeRange", () => {
  it("enumerates an inclusive range preserving leading zeroes", () => {
    expect(enumerateCodeRange("0001", "0005")).toEqual([
      "0001",
      "0002",
      "0003",
      "0004",
      "0005",
    ]);
  });

  it("handles a single-code range", () => {
    expect(enumerateCodeRange("0001", "0001")).toEqual(["0001"]);
  });

  it("walks across four-digit boundaries as strings", () => {
    expect(enumerateCodeRange("0999", "1002")).toEqual([
      "0999",
      "1000",
      "1001",
      "1002",
    ]);
  });

  it("rejects malformed codes", () => {
    expect(() => enumerateCodeRange("001", "2000")).toThrow(InventoryImportError);
    expect(() => enumerateCodeRange("0001", "20000")).toThrow(InventoryImportError);
  });

  it("rejects a range whose end precedes its start", () => {
    expect(() => enumerateCodeRange("2000", "0001")).toThrow(InventoryImportError);
  });

  it("caps at 9999 (four-digit format)", () => {
    expect(() => enumerateCodeRange("9997", "0001")).toThrow(InventoryImportError);
  });
});