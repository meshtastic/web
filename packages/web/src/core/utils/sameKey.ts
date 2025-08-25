export function isEmptyKey(key?: Uint8Array): boolean {
  return !key || key.length === 0;
}

export function isSameKey(a?: Uint8Array, b?: Uint8Array): boolean {
  if (isEmptyKey(a) && isEmptyKey(b)) {
    return true;
  }
  if (!a || !b) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}
