function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function deepCompareConfig(
  a: unknown,
  b: unknown,
  allowUndefined = false,
): boolean {
  if (a === b) {
    return true;
  }

  // If allowUndefined is true, and one is undefined, they are considered equal. // This check is placed early to simplify subsequent logic.
  if (allowUndefined && (a === undefined || b === undefined)) {
    return true;
  }

  if (typeof a !== typeof b || a === null || b === null) {
    return false;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length && !allowUndefined) {
      return false;
    }

    const longestLength = Math.max(a.length, b.length);
    for (let i = 0; i < longestLength; i++) {
      if (!deepCompareConfig(a[i], b[i], allowUndefined)) {
        return false;
      }
    }
    return true;
  }

  if (isObject(a) && isObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    const allKeys = new Set([...aKeys, ...bKeys]);

    for (const key of allKeys) {
      if (key === "$typeName") {
        continue;
      }

      const aValue = a[key];
      const bValue = b[key];

      if (!deepCompareConfig(aValue, bValue, allowUndefined)) {
        return false;
      }
    }
    return true;
  }

  return false;
}
