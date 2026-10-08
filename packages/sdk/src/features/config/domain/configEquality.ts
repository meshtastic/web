/**
 * Value-equality used by {@link ConfigEditor} to decide whether a config
 * section still matches the device's baseline.
 *
 * This has to compare two things that are *never* structurally identical even
 * when they mean exactly the same thing:
 *
 * - the **baseline**, which is a `@bufbuild/protobuf` message: it carries a
 *   `$typeName` marker and every singular scalar field is materialised as an
 *   own property holding its zero value (`false` / `0` / `""`), and
 * - the **working copy**, which is whatever the UI staged. Web forms hand over
 *   plain objects produced by a Zod resolver, so they have no `$typeName`, and
 *   fields the form does not render are simply absent.
 *
 * A naive key-count/`Object.keys(a)` comparison therefore reports "changed"
 * forever, which pins the working copy (the editor refuses to let inbound
 * device config overwrite a section it believes is dirty) and makes the UI
 * report stale values as if they were saved. It also gets `undefined` vs
 * `false` wrong in both directions.
 *
 * The rules implemented here mirror protobuf's own semantics:
 *
 * - `$typeName` is metadata, not data.
 * - Keys are compared over the *union* of both sides, so a field that only one
 *   side carries is never skipped.
 * - An absent field is equal to that field's protobuf default
 *   (`undefined` == `false` / `0` / `0n` / `""` / empty bytes / empty list),
 *   and *only* to its default — an absent field is never equal to `true`.
 * - An absent sub-message is equal to a sub-message whose fields are all
 *   defaults.
 * - `Uint8Array` is compared byte-wise, repeated fields element-wise.
 */

function isAbsent(value: unknown): boolean {
  return value === undefined || value === null;
}

/** True when `value` is the protobuf zero value for its type (or absent). */
function isProtobufDefault(value: unknown): boolean {
  if (isAbsent(value)) {
    return true;
  }
  if (value instanceof Uint8Array) {
    return value.byteLength === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).every(
      ([key, entry]) => key === "$typeName" || isProtobufDefault(entry),
    );
  }
  return value === false || value === 0 || value === 0n || value === "";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Uint8Array)
  );
}

const EMPTY_RECORD: Record<string, unknown> = {};

export function configValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }

  if (a instanceof Uint8Array || b instanceof Uint8Array) {
    if (a instanceof Uint8Array && b instanceof Uint8Array) {
      return bytesEqual(a, b);
    }
    // One side is absent: equal only if the present side is empty bytes.
    const present = a instanceof Uint8Array ? a : (b as Uint8Array);
    const other = a instanceof Uint8Array ? b : a;
    return present.byteLength === 0 && isAbsent(other);
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) && !isAbsent(a)) {
      return false;
    }
    if (!Array.isArray(b) && !isAbsent(b)) {
      return false;
    }
    const left = Array.isArray(a) ? a : [];
    const right = Array.isArray(b) ? b : [];
    if (left.length !== right.length) {
      return false;
    }
    return left.every((value, index) => configValuesEqual(value, right[index]));
  }

  if (isRecord(a) || isRecord(b)) {
    if (!isRecord(a) && !isAbsent(a)) {
      return false;
    }
    if (!isRecord(b) && !isAbsent(b)) {
      return false;
    }
    const left = isRecord(a) ? a : EMPTY_RECORD;
    const right = isRecord(b) ? b : EMPTY_RECORD;
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of keys) {
      if (key === "$typeName") {
        continue;
      }
      if (!configValuesEqual(left[key], right[key])) {
        return false;
      }
    }
    return true;
  }

  // Scalars. An absent field carries its protobuf default, so `undefined`
  // equals `false`/`0`/`""` — but never `true`, `1`, or a non-empty string.
  if (isAbsent(a)) {
    return isProtobufDefault(b);
  }
  if (isAbsent(b)) {
    return isProtobufDefault(a);
  }
  return false;
}
