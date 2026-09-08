import { z } from "zod";

export type ValidationResult<T> = { success: true; data: T } | { success: false; issues: string[] };

/**
 * Parse unknown input with a Zod schema, normalizing the validation result.
 * Used for server-side validation of external input.
 */
export function parseWithZod<T>(schema: z.ZodType<T>, input: unknown): ValidationResult<T> {
  const result = schema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    issues: result.error.issues.map(
      (issue) => `${issue.path.join(".") || "value"}: ${issue.message}`,
    ),
  };
}
