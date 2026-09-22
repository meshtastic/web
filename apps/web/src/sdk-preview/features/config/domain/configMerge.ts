/**
 * Merge a staged (UI-produced) config value over the value the device last
 * reported, so that a partial form submission can never silently reset fields
 * the form does not manage.
 *
 * Why this is needed
 * ------------------
 * Every settings form in the web app hands {@link ConfigEditor} the *output of
 * its Zod resolver*, and `commit()` feeds that object straight into
 * `create(SomeSchema, value)`. Zod object schemas strip keys they do not
 * declare, so any protobuf field the form does not list simply disappears from
 * the staged object — and `create()` then materialises it at its protobuf
 * default. Saving one toggle therefore silently rewrites every unlisted field
 * on the device to `false` / `0` / `""`.
 *
 * The same gap also produced phantom dirty state: a section whose baseline
 * carries a non-default value that the form omits never compares equal to the
 * staged object, so it stayed flagged as "unsaved" forever.
 *
 * The rule implemented here is deliberately narrow:
 *
 * - Only keys that are **absent** (`undefined`) in the staged value and
 *   **present** in the baseline are filled in. A key the form did send always
 *   wins, including `false`, `0`, `""` and `[]` — clearing a list or turning a
 *   toggle off must still reach the device.
 * - Recursion happens only where both sides are plain records, so protobuf
 *   sub-messages (`mapReportSettings`, `moduleSettings`, `ipv4Config`, …) are
 *   merged field-by-field instead of being replaced wholesale.
 * - `Uint8Array` and arrays are values, never merged element-wise.
 * - When the staged value is already a full protobuf message every singular
 *   field is materialised, so this is a no-op — staging a `create()`d message
 *   (channels, the LoRa import path, …) behaves exactly as before.
 */

function isMergeableRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Uint8Array)
  );
}

export function mergeStagedValue<T>(baseline: unknown, staged: T): T {
  if (!isMergeableRecord(staged) || !isMergeableRecord(baseline)) {
    return staged;
  }

  let merged: Record<string, unknown> | undefined;
  const write = (key: string, value: unknown): void => {
    merged ??= { ...(staged as Record<string, unknown>) };
    merged[key] = value;
  };

  for (const [key, baseValue] of Object.entries(baseline)) {
    if (key === "$typeName") {
      continue;
    }
    const stagedValue = (staged as Record<string, unknown>)[key];

    if (stagedValue === undefined) {
      // The form never declared this field — keep what the device reported.
      if (baseValue !== undefined) {
        write(key, baseValue);
      }
      continue;
    }

    if (isMergeableRecord(stagedValue) && isMergeableRecord(baseValue)) {
      const mergedChild = mergeStagedValue(baseValue, stagedValue);
      if (mergedChild !== stagedValue) {
        write(key, mergedChild);
      }
    }
  }

  return (merged ?? staged) as T;
}
