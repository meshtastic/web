/**
 * Display helpers for the Security section's key rows. Pure.
 */

/** Shown in place of a hidden private key; fixed length, so it leaks nothing. */
export const MASKED_KEY = "•".repeat(28);

export const ADMIN_KEY_SLOTS = 3;

export interface AdminKeySlots {
  /** Slots holding a key, in order. */
  readonly filled: readonly {
    readonly index: number;
    readonly value: string;
  }[];
  /** First empty slot, where "Add admin key" puts the next key. */
  readonly nextEmpty: number | undefined;
}

/** Which of the radio's admin key slots hold a key (an empty string is empty). */
export function adminKeySlots(keys: readonly string[]): AdminKeySlots {
  const slots = Array.from(
    { length: ADMIN_KEY_SLOTS },
    (_, index) => keys[index]?.trim() ?? "",
  );
  const filled = slots.flatMap((value, index) =>
    value === "" ? [] : [{ index, value }],
  );
  const empty = slots.findIndex((value) => value === "");
  return { filled, nextEmpty: empty === -1 ? undefined : empty };
}
