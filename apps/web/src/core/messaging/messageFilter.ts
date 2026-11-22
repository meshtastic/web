import { Result } from "better-result";
import type { ThreadMessage } from "./thread.ts";

/**
 * Message filter words: hide incoming text containing them.
 *
 * Semantics follow the Android app at meshtastic/Meshtastic-Android
 * b2c52cba8c:
 *
 * - core/data/.../manager/MessageFilterImpl.kt (matching):
 *   - A plain entry matches as a whole word: `\b<word>\b`, ignoring case,
 *     with the word taken literally.
 *   - An entry starting with `regex:` (prefix is case-sensitive) is the
 *     regular expression after the prefix, also ignoring case.
 *   - A message is filtered when any entry matches anywhere in it
 *     (`containsMatchIn`, not a full match), checking only its first 10,000
 *     characters (`MAX_CHECK_LENGTH`).
 *   - An entry that does not compile is skipped (logged, never matches).
 *     Android has no guard against slow (catastrophic) patterns, so neither
 *     does this; mesh texts are a couple of hundred bytes at most.
 * - feature/settings/.../filter/FilterSettingsViewModel.kt (editing): the
 *   input is trimmed, blank input is ignored, and an entry already in the
 *   list (exact, case-sensitive string) is not added twice. Removal is by
 *   the exact string.
 * - core/data/.../manager/MeshDataHandlerImpl.kt `persistDataPacket`
 *   (where it applies): only incoming text messages, only while filtering
 *   is on and the conversation has not opted out (`filteringDisabled` in
 *   contact settings). A filtered message is stored as read and filtered, so
 *   it never counts as unread, never becomes the conversation preview and
 *   raises no notification (core/database/.../dao/PacketDao.kt
 *   `filtered = 0` in the contact and unread queries).
 * - feature/messaging/.../component/MessageScreenComponents.kt: the
 *   conversation menu offers "Show/Hide N filtered" (only when N > 0 and the
 *   conversation has not opted out) and the per-conversation toggle (only
 *   while filtering is on). A revealed message is muted and labelled
 *   "Filtered" (component/MessageItem.kt).
 *
 * Differences, on purpose:
 * - Word boundaries are Unicode-aware. JavaScript's `\b` only knows ASCII
 *   word characters, so a word like "café" or "спам" would never match;
 *   the boundary is spelled out with Unicode classes instead
 *   (`WORD_BOUNDARY`, ICU's definition of a word character). Android's own
 *   tests cover ASCII words only. As with `\b`, a boundary needs a word
 *   character on one side, so an entry that starts or ends with
 *   punctuation ("#tag") only matches next to a word character.
 * - Regular expressions use JavaScript syntax (flags `iu`). Java-only syntax
 *   (possessive quantifiers, `\Q…\E`, inline `(?i)`) does not compile.
 * - Android drops an invalid entry silently when matching; here it is
 *   rejected with the reason when it is added, as is `regex:` with nothing
 *   after it (which on Android hides every message).
 * - The thread re-evaluates the current words (so editing them applies to
 *   messages already received); previews and unread counts keep the
 *   decision made when a message arrived, as Android stores it.
 */

export const REGEX_PREFIX = "regex:";

/** Characters of a message that are checked (Android's MAX_CHECK_LENGTH). */
export const MAX_CHECK_LENGTH = 10_000;

export type FilterEntry =
  | { readonly kind: "word"; readonly raw: string; readonly word: string }
  | { readonly kind: "regex"; readonly raw: string; readonly pattern: string };

/** What the list shows for an entry: the word, or the pattern without `regex:`. */
export const parseFilterEntry = (raw: string): FilterEntry =>
  raw.startsWith(REGEX_PREFIX)
    ? { kind: "regex", raw, pattern: raw.slice(REGEX_PREFIX.length) }
    : { kind: "word", raw, word: raw };

/** Why an entry can't be added. */
export type FilterEntryError =
  | { readonly kind: "empty" }
  | { readonly kind: "duplicate" }
  | { readonly kind: "emptyPattern" }
  | { readonly kind: "invalidRegex"; readonly reason: string };

// ICU's \w: letters (Alphabetic), marks, decimal digits, connector
// punctuation and the zero-width joiners.
const WORD_CHAR = "[\\p{Alphabetic}\\p{M}\\p{Nd}\\p{Pc}\\u200C\\u200D]";
const WORD_BOUNDARY = `(?:(?<=${WORD_CHAR})(?!${WORD_CHAR})|(?<!${WORD_CHAR})(?=${WORD_CHAR}))`;
const FLAGS = "iu";

/** Escapes `text` to match literally in a `u`-mode pattern. */
const escapeLiteral = (text: string): string =>
  text.replace(/[\\^$.*+?()[\]{}|/]/g, String.raw`\$&`);

const regexError = (cause: unknown): FilterEntryError => ({
  kind: "invalidRegex",
  // V8 repeats the pattern ("Invalid regular expression: /(x/iu: ..."); the
  // field already shows it, so keep only the reason.
  reason: (cause instanceof Error ? cause.message : String(cause)).replace(
    /^Invalid regular expression: \/.*\/[a-z]*: /s,
    "",
  ),
});

/** One entry as a matcher, or why it doesn't compile. */
export const compileFilterEntry = (
  entry: FilterEntry,
): Result<RegExp, FilterEntryError> => {
  if (entry.kind === "word") {
    return Result.ok(
      new RegExp(
        `${WORD_BOUNDARY}${escapeLiteral(entry.word)}${WORD_BOUNDARY}`,
        FLAGS,
      ),
    );
  }
  if (entry.pattern.length === 0) return Result.err({ kind: "emptyPattern" });
  return Result.try({
    try: () => new RegExp(entry.pattern, FLAGS),
    catch: regexError,
  });
};

/**
 * Checks what the user typed against the stored entries. Ok holds the
 * entry to store (trimmed, as Android stores it).
 */
export const validateFilterEntry = (
  input: string,
  existing: readonly string[],
): Result<string, FilterEntryError> => {
  const raw = input.trim();
  if (raw.length === 0) return Result.err({ kind: "empty" });
  if (existing.includes(raw)) return Result.err({ kind: "duplicate" });
  const compiled = compileFilterEntry(parseFilterEntry(raw));
  return Result.isError(compiled) ? Result.err(compiled.error) : Result.ok(raw);
};

/** Every stored entry, compiled. Entries that don't compile are left out. */
export interface FilterMatcher {
  readonly patterns: readonly RegExp[];
}

export const EMPTY_MATCHER: FilterMatcher = { patterns: [] };

export const compileFilter = (entries: readonly string[]): FilterMatcher => {
  const patterns = entries.flatMap((raw) => {
    const compiled = compileFilterEntry(parseFilterEntry(raw));
    return Result.isOk(compiled) ? [compiled.value] : [];
  });
  return patterns.length === 0 ? EMPTY_MATCHER : { patterns };
};

/** True when any entry matches within the first `MAX_CHECK_LENGTH` characters. */
export const isFiltered = (text: string, matcher: FilterMatcher): boolean => {
  if (matcher.patterns.length === 0) return false;
  const checked = text.slice(0, MAX_CHECK_LENGTH);
  return matcher.patterns.some((pattern) => pattern.test(checked));
};

/** The filter as it applies to one radio's conversations. */
export interface FilterState {
  readonly enabled: boolean;
  readonly matcher: FilterMatcher;
  /** Conversations (`conversationKeyString`) with filtering turned off. */
  readonly optedOut: ReadonlySet<string>;
}

export const DISABLED_FILTER: FilterState = {
  enabled: false,
  matcher: EMPTY_MATCHER,
  optedOut: new Set(),
};

/** Whether the filter applies in conversation `key` at all. */
export const filterAppliesTo = (state: FilterState, key: string): boolean =>
  state.enabled &&
  state.matcher.patterns.length > 0 &&
  !state.optedOut.has(key);

/**
 * Whether a message arriving in conversation `key` is filtered: incoming
 * text only, never my own.
 */
export const shouldFilterIncoming = (
  state: FilterState,
  key: string,
  message: { readonly from: number; readonly text: string },
  myNodeNum: number,
): boolean =>
  message.from !== myNodeNum &&
  filterAppliesTo(state, key) &&
  isFiltered(message.text, state.matcher);

export interface ThreadFilterResult {
  /** What the list shows. */
  readonly messages: ThreadMessage[];
  /** Incoming messages the filter matches, shown or not. */
  readonly filtered: number;
}

/**
 * Applies the filter to a built thread. Outgoing messages are never
 * filtered. Matching messages are dropped, or with `reveal` kept and
 * marked `filtered` (through `mark`, so callers can keep their identity).
 */
export const applyThreadFilter = (
  thread: ThreadMessage[],
  options: {
    readonly active: boolean;
    readonly matcher: FilterMatcher;
    readonly reveal: boolean;
    readonly mark?: (item: ThreadMessage) => ThreadMessage;
  },
): ThreadFilterResult => {
  if (!options.active || options.matcher.patterns.length === 0) {
    return { messages: thread, filtered: 0 };
  }
  const mark =
    options.mark ??
    ((item: ThreadMessage): ThreadMessage => ({ ...item, filtered: true }));
  let filtered = 0;
  const messages: ThreadMessage[] = [];
  for (const item of thread) {
    if (item.outgoing || !isFiltered(item.message.text, options.matcher)) {
      messages.push(item);
      continue;
    }
    filtered++;
    if (options.reveal) messages.push(mark(item));
  }
  return filtered === 0
    ? { messages: thread, filtered }
    : { messages, filtered };
};

/** Entries in the order the settings list shows them (Android sorts them). */
export const sortFilterEntries = (entries: readonly string[]): string[] =>
  [...entries].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
