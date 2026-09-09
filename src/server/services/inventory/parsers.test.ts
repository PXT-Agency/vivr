import { describe, expect, it } from "vitest";

import { normalizeRows, parseSource, splitCells } from "./parsers";

describe("splitCells", () => {
  it("splits pipe-delimited markdown rows and strips outer pipes", () => {
    expect(splitCells("| *0001 | Available | Silver |")).toEqual([
      "*0001",
      "Available",
      "Silver",
    ]);
  });

  it("splits comma-delimited CSV rows", () => {
    expect(splitCells("*0001, Available, Silver")).toEqual([
      "*0001",
      "Available",
      "Silver",
    ]);
  });

  it("preserves interior empty cells", () => {
    expect(splitCells("| *0001 | | Silver |")).toEqual(["*0001", "", "Silver"]);
  });

  it("returns an empty array for blank rows", () => {
    expect(splitCells("")).toEqual([]);
  });
});

describe("parseSource", () => {
  const md = [
    "| STAR NUMBER | STATUS | CATEGORY |",
    "|---|---|---|",
    "| *0001 | Available | Silver |",
    "| *0002 | Available | Gold |",
    "",
  ].join("\n");

  it("skips the header row, separator lines, and blank lines", () => {
    const rows = parseSource(md);
    expect(rows.map((row) => row.cells[0])).toEqual(["*0001", "*0002"]);
    expect(rows.map((row) => row.lineNumber)).toEqual([3, 4]);
  });

  it("skips # comment lines in CSV-style sources", () => {
    const csv = [
      "# generated export",
      "| STAR NUMBER | STATUS | CATEGORY |",
      "| --- | --- | --- |",
      "| *1000 | Available | Diamond |",
    ].join("\n");

    const rows = parseSource(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.cells).toEqual(["*1000", "Available", "Diamond"]);
  });

  it("parses comma-delimited content with identical semantics", () => {
    const rows = parseSource(
      ["STAR NUMBER,STATUS,CATEGORY", "*0001, Available, Silver"].join("\n"),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.cells).toEqual(["*0001", "Available", "Silver"]);
  });

  it("keeps raw source lines and their line numbers", () => {
    const rows = parseSource(md);
    expect(rows[0]?.raw).toBe("| *0001 | Available | Silver |");
    expect(rows[0]?.lineNumber).toBe(3);
  });
});

describe("normalizeRows", () => {
  it("preserves leading zeroes and derives the public display form", () => {
    const rows = normalizeRows(parseSource(
      ["| *0007 | Available | Platinum |"].join("\n"),
    ));
    expect(rows[0]?.numberCode).toBe("0007");
    expect(rows[0]?.displayNumber).toBe("*0007");
    expect(rows[0]?.errors).toEqual([]);
  });

  it("normalizes status and category to canonical machine values", () => {
    const rows = normalizeRows(parseSource(
      ["| *0042 | available | diamond |"].join("\n"),
    ));
    expect(rows[0]?.status).toBe("available");
    expect(rows[0]?.category).toBe("diamond");
  });

  it("flags an invalid number code without coercing it", () => {
    const rows = normalizeRows(parseSource(
      ["| *12 | Available | Silver |"].join("\n"),
    ));
    expect(rows[0]?.errors.map((error) => error.code)).toEqual([
      "invalid_number_code",
    ]);
  });

  it("flags invalid status and category values", () => {
    const rows = normalizeRows(parseSource(
      ["| *0001 | Archived | Bronze |"].join("\n"),
    ));
    expect(rows[0]?.errors.map((error) => error.code).sort()).toEqual([
      "invalid_category",
      "invalid_status",
    ]);
  });

  it("flags a missing number code", () => {
    const rows = normalizeRows(parseSource(
      ["| | Available | Silver |"].join("\n"),
    ));
    expect(rows[0]?.errors.map((error) => error.code)).toEqual([
      "missing_number_code",
    ]);
  });

  it("flags rows with the wrong number of columns", () => {
    const rows = normalizeRows(parseSource(
      ["| *0001 | Available |"].join("\n"),
    ));
    expect(rows[0]?.errors.map((error) => error.code)).toEqual([
      "unexpected_columns",
    ]);
  });
});