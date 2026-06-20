function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUint8Array(v: unknown): v is Uint8Array {
  return v instanceof Uint8Array;
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) {
    return false;
  }
  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

export function deepCompareConfig(
  a: unknown,
  b: unknown,
  allowUndefined = false,
): boolean {
  if (a === b) {
    return true;
  }

  if (isUint8Array(a) || isUint8Array(b)) {
    return isUint8Array(a) && isUint8Array(b) && bytesEqual(a, b);
  }

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
