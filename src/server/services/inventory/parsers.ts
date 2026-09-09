import {
  isStarNumberCategory,
  isStarNumberStatus,
  STAR_NUMBER_CATEGORIES,
  STAR_NUMBER_STATUSES,
  type StarNumberCategory,
  type StarNumberStatus,
} from "@/config/starNumbers";

/**
 * Import source row-level parsing and normalization.
 *
 * The two supplied sources (`star-inventory-part-01-2.md` and
 * `star-inventory-part-02.csv`) use the logical columns
 * `STAR NUMBER, STATUS, CATEGORY`. The .md file is a Markdown table; the .csv
 * is technically CSV but is structured as a Markdown-style table
 * (pipe-delimited with a `#` comment header). Both formats are parsed
 * explicitly and every non-blank, non-comment, non-header line becomes a row.
 *
 * Missing records are represented as missing `number_code` values in leading-
 * zero-preserving text form; nothing is coerced to integers.
 */

export interface ParsedRow {
  /** Physical 1-based line number within the source file. */
  readonly lineNumber: number;
  /** Original source line (preserved for audit). */
  readonly raw: string;
  /** Trimmed cells after pipe/comma splitting. */
  readonly cells: string[];
  /**
   * Source file label (e.g. the filename). Set by the import service when
   * combining multiple files into a single batch so every row is auditable.
   */
  readonly sourceFile?: string;
}

/**
 * Split a source row into trimmed cells. The supplied `.csv` source is
 * actually pipe-delimited Markdown-style despite its extension, so separator
 * detection is based on content: lines containing `|` are split on pipes
 * (outer pipes stripped); otherwise lines are split on commas. Interior empty
 * cells are preserved so that a genuinely malformed row is reported rather
 * than silently repaired.
 */
export function splitCells(raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed === "") return [];

  let cells: string[];
  if (trimmed.includes("|")) {
    const stripped = trimmed.startsWith("|") ? trimmed.slice(1) : trimmed;
    const rightStripped = stripped.endsWith("|") ? stripped.slice(0, -1) : stripped;
    cells = rightStripped.split("|");
  } else if (trimmed.includes(",")) {
    cells = trimmed.split(",");
  } else {
    cells = [trimmed];
  }

  return cells.map((cell) => cell.trim());
}

/**
 * Parse source content into rows, skipping:
 * - leading `#` comment lines (CSV header),
 * - Markdown table column-alignment separator lines,
 * - the header row (first row whose first cell matches `star number`),
 * - blank lines.
 */
export function parseSource(content: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const lines = content.split(/\r?\n/);

  let headerSeen = false;
  for (let index = 0; index < lines.length; index++) {
    const lineNumber = index + 1;
    const raw = lines[index];
    if (raw === undefined) continue;

    const trimmed = raw.trim();
    if (trimmed === "") continue;
    if (trimmed.startsWith("#")) continue;
    // Markdown table separator: `|---|---|` or `|------|`.
    if (/^\|?[\s:|-]+$/.test(trimmed) && trimmed.includes("-")) continue;

    const cells = splitCells(trimmed);
    if (!headerSeen && cells[0]?.toLowerCase() === "star number") {
      headerSeen = true;
      continue;
    }

    rows.push({ lineNumber, raw: trimmed, cells });
  }

  return rows;
}

export interface RowError {
  readonly code: string;
  readonly message: string;
}

export interface NormalizedRow {
  readonly lineNumber: number;
  readonly raw: string;
  readonly originalCells: string[];
  readonly sourceFile?: string;
  readonly numberCode: string | null;
  readonly displayNumber: string | null;
  readonly category: StarNumberCategory | null;
  readonly status: StarNumberStatus | null;
  readonly errors: RowError[];
}

const FORMAT_CODE_PATTERN = /^[0-9]{4}$/;

/**
 * Normalize one parsed row into canonical fields.
 *
 * - Removes a leading `*` from the source number to derive `number_code`,
 *   preserving leading zeroes as text.
 * - Reconstructs the canonical `display_number` as `*` + number_code (the
 *   source display value is never trusted).
 * - Normalizes lowercase category and status to canonical machine values.
 * - Accumulates per-row errors; a row with any errors must not be committed.
 */
export function normalizeRow(row: ParsedRow): NormalizedRow {
  const [numberRaw, statusRaw, categoryRaw] = row.cells;
  if (row.cells.length !== 3) {
    return {
      lineNumber: row.lineNumber,
      raw: row.raw,
      originalCells: row.cells,
      sourceFile: row.sourceFile,
      numberCode: null,
      displayNumber: null,
      category: null,
      status: null,
      errors: [
        {
          code: "unexpected_columns",
          message: `Expected 3 columns (STAR NUMBER, STATUS, CATEGORY), got ${row.cells.length}.`,
        },
      ],
    };
  }

  const errors: RowError[] = [];

  const numberWithStar = (numberRaw ?? "").trim();
  const numberCode = numberWithStar.startsWith("*")
    ? numberWithStar.slice(1).trim()
    : numberWithStar;

  let code: string | null = null;
  if (numberCode === "") {
    errors.push({ code: "missing_number_code", message: "Missing STAR NUMBER." });
  } else if (!FORMAT_CODE_PATTERN.test(numberCode)) {
    errors.push({
      code: "invalid_number_code",
      message: `Invalid number code "${numberCode}": expected exactly four digits.`,
    });
  } else {
    code = numberCode;
  }

  const statusValue = (statusRaw ?? "").trim().toLowerCase();
  let status: StarNumberStatus | null = null;
  if (!isStarNumberStatus(statusValue)) {
    errors.push({
      code: "invalid_status",
      message: `Invalid status "${statusRaw ?? ""}" (expected one of ${STAR_NUMBER_STATUSES.join(", ")}).`,
    });
  } else {
    status = statusValue;
  }

  const categoryValue = (categoryRaw ?? "").trim().toLowerCase();
  let category: StarNumberCategory | null = null;
  if (!isStarNumberCategory(categoryValue)) {
    errors.push({
      code: "invalid_category",
      message: `Invalid category "${categoryRaw ?? ""}" (expected one of ${STAR_NUMBER_CATEGORIES.join(", ")}).`,
    });
  } else {
    category = categoryValue;
  }

  return {
    lineNumber: row.lineNumber,
    raw: row.raw,
    originalCells: row.cells,
    sourceFile: row.sourceFile,
    numberCode: code,
    displayNumber: code ? `*${code}` : null,
    category,
    status,
    errors,
  };
}

/**
 * Normalize all parsed rows. Returns rows in source order; per-row errors are
 * recorded on each row (rejected rows keep their original source text).
 */
export function normalizeRows(rows: ParsedRow[]): NormalizedRow[] {
  return rows.map(normalizeRow);
}