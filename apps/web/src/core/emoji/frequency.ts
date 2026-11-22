/**
 * How often each emoji was picked, to put the favourites in the quick row.
 * Mirrors the Android app: a pick from the emoji picker counts once (with
 * its skin tone, as sent); the quick row shows the six most used, most
 * used first, ties in order of first use.
 */

export interface EmojiUse {
  readonly emoji: string;
  readonly count: number;
}

export type EmojiFrequency = readonly EmojiUse[];

/** How many emoji the quick rows show (Android's MAX_EMOJI_ROW_SIZE). */
export const QUICK_EMOJI_COUNT = 6;

/** The quick row before anything has been picked (Android's defaults). */
export const DEFAULT_QUICK_EMOJIS: readonly string[] = [
  "👍",
  "👎",
  "😂",
  "🔥",
  "❤️",
  "😮",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * Stored frequencies, validated: entries need a non-empty emoji and a
 * positive whole count; anything else is dropped, as is a repeat of an
 * emoji already seen.
 */
export const parseEmojiFrequency = (value: unknown): EmojiUse[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const uses: EmojiUse[] = [];
  for (const entry of value) {
    if (
      !isRecord(entry) ||
      typeof entry.emoji !== "string" ||
      entry.emoji === "" ||
      typeof entry.count !== "number" ||
      !Number.isInteger(entry.count) ||
      entry.count < 1 ||
      seen.has(entry.emoji)
    ) {
      continue;
    }
    seen.add(entry.emoji);
    uses.push({ emoji: entry.emoji, count: entry.count });
  }
  return uses;
};

/** One more use of `emoji`; a new emoji goes on the end with a count of 1. */
export const recordEmojiUse = (
  frequency: EmojiFrequency,
  emoji: string,
): EmojiUse[] => {
  if (emoji === "") {
    return [...frequency];
  }
  const index = frequency.findIndex((u) => u.emoji === emoji);
  if (index === -1) {
    return [...frequency, { emoji, count: 1 }];
  }
  return frequency.map((u, i) =>
    i === index ? { emoji: u.emoji, count: u.count + 1 } : u,
  );
};

/** The most used emoji, most used first; ties keep first-use order. */
export const mostUsedEmojis = (
  frequency: EmojiFrequency,
  count: number,
): string[] =>
  frequency
    .map((use, index) => ({ use, index }))
    .sort((a, b) => b.use.count - a.use.count || a.index - b.index)
    .slice(0, Math.max(count, 0))
    .map((s) => s.use.emoji);

/**
 * The quick row: the `count` most used emoji, topped up from the defaults
 * (skipping any already there) so the row is always full. The Android
 * app shows only the used ones once there are any; topping up keeps the
 * row the same width as it fills.
 */
export const quickEmojis = (
  frequency: EmojiFrequency,
  count: number = QUICK_EMOJI_COUNT,
  defaults: readonly string[] = DEFAULT_QUICK_EMOJIS,
): string[] => {
  const top = mostUsedEmojis(frequency, count);
  for (const emoji of defaults) {
    if (top.length >= count) {
      break;
    }
    if (!top.includes(emoji)) {
      top.push(emoji);
    }
  }
  return top;
};
