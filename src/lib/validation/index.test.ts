import { describe, expect, it } from "vitest";
import { z } from "zod";

import { parseWithZod } from "./index";

describe("parseWithZod", () => {
  const schema = z.object({
    name: z.string().min(1),
    count: z.number().int().nonnegative(),
  });

  it("returns data for valid input", () => {
    const result = parseWithZod(schema, { name: "test", count: 3 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "test", count: 3 });
    }
  });

  it("reports issues for invalid input", () => {
    const result = parseWithZod(schema, { name: "", count: -1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.some((issue) => issue.includes("name"))).toBe(true);
      expect(result.issues.some((issue) => issue.includes("count"))).toBe(true);
    }
  });
});
