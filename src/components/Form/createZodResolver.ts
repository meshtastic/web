import type { ZodType } from "zod/v4";
import type {
  FieldError,
  FieldValues,
  Resolver,
  ResolverOptions,
  ResolverResult,
} from "react-hook-form";

export function createZodResolver<T extends FieldValues>(
  schema: ZodType<T, unknown>,
): Resolver<T, unknown> {
  return (
    values: T,
    _context: unknown,
    _options?: ResolverOptions<T>,
  ): ResolverResult<T> => {
    const result = schema.safeParse(values);
    if (result.success) {
      return {
        values: result.data,
        errors: {},
      };
    }

    const errors: Record<
      string,
      FieldError & { params?: Record<string, unknown> }
    > = {};

    for (const issue of result.error.issues) {
      const { path, code, message, ...params } = issue;
      const key = path.join(".");

      const fieldError: FieldError & { params?: Record<string, unknown> } = {
        type: code,
        message: message,
        ...(Object.keys(params).length ? { params } : {}),
      };

      if (!errors[key]) {
        errors[key] = fieldError;
      }
    }

    return {
      values: {} as T,
      errors,
    };
  };
}
