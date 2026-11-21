import type { EmojiPrefs } from "@components/Messages/useEmoji.ts";
import { DEFAULT_QUICK_EMOJIS } from "@core/emoji/frequency.ts";
import { vi } from "vitest";

/** Emoji picker memory for component tests: the default quick row. */
export const testEmojiPrefs = (
  overrides: Partial<EmojiPrefs> = {},
): EmojiPrefs => ({
  quick: DEFAULT_QUICK_EMOJIS,
  skinTone: 0,
  setSkinTone: vi.fn(),
  recordUse: vi.fn(),
  ...overrides,
});
