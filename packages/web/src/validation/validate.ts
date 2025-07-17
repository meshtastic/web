import type { ZodError, ZodType } from "zod/v4";

export function validateSchema<T>(
  schema: ZodType<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: ZodError["issues"] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
}
