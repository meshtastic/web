export function deepCompareConfig(
  existing: unknown,
  working: unknown,
  allowUndefined = false,
): boolean {
  if (existing === working) return true;

  if (
    allowUndefined &&
    (typeof existing === "undefined" || typeof working === "undefined")
  ) return true;

  if (typeof existing !== typeof working) {
    return false;
  }

  if (existing === null || working === null) {
    if (existing !== working) {
      return false;
    }
    return true;
  }

  if (Array.isArray(existing) && Array.isArray(working)) {
    if (existing.length !== working.length && !allowUndefined) {
      return false;
    }
    for (let i = 0; i < existing.length; i++) {
      if (
        !deepCompareConfig(existing[i], working[i], allowUndefined)
      ) {
        return false;
      }
    }
    return true;
  }

  if (typeof existing === "object" && typeof working === "object") {
    const exObj = existing as Record<string, unknown>;
    const woObj = working as Record<string, unknown>;
    const keys = new Set<string>([
      ...Object.keys(exObj),
      ...Object.keys(woObj),
    ]);

    for (const key of keys) {
      if (key === "$typeName") continue;
      const hasExisting = Object.prototype.hasOwnProperty.call(exObj, key);
      const hasWorking = Object.prototype.hasOwnProperty.call(woObj, key);
      const valExisting = exObj[key];
      const valWorking = woObj[key];

      if (!hasWorking && allowUndefined && hasExisting) {
        continue;
      }

      if (
        !deepCompareConfig(valExisting, valWorking, allowUndefined)
      ) {
        return false;
      }
    }

    return true;
  }

  return false;
}
