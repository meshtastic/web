import { deepCompareConfig } from "./deepCompareConfig.ts";

/**
 * Keys whose values differ between the saved settings and the draft being
 * edited. Values are compared structurally (nested objects, arrays and byte
 * arrays like keys), ignoring protobuf `$typeName` tags. Keys present on
 * only one side count when their value there is not `undefined`.
 */
export const diffFields = <T extends Record<string, unknown>>(
  saved: T,
  draft: T,
): (keyof T & string)[] => {
  const isKey = (key: string): key is keyof T & string =>
    key !== "$typeName" && (key in saved || key in draft);
  const keys = new Set([...Object.keys(saved), ...Object.keys(draft)]);
  return [...keys]
    .filter(isKey)
    .filter((key) => !deepCompareConfig(saved[key], draft[key]));
};

export const isDirty = <T extends Record<string, unknown>>(
  saved: T,
  draft: T,
): boolean => diffFields(saved, draft).length > 0;

/** Whether one field differs, for marking a single control. */
export const isFieldDirty = <T extends Record<string, unknown>>(
  saved: T,
  draft: T,
  key: keyof T & string,
): boolean => !deepCompareConfig(saved[key], draft[key]);
