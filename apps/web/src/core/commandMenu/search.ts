import { normalizeForSearch } from "@core/messaging/conversationList.ts";
import type { Command, CommandKind } from "./types.ts";

/** Typing this first limits results to commands (navigation + actions). */
export const COMMANDS_ONLY_PREFIX = ">";

export interface ParsedQuery {
  /** Normalised search terms; empty when nothing was typed. */
  readonly terms: ReadonlyArray<string>;
  readonly commandsOnly: boolean;
}

export const parseQuery = (raw: string): ParsedQuery => {
  const trimmed = raw.trimStart();
  const commandsOnly = trimmed.startsWith(COMMANDS_ONLY_PREFIX);
  const text = commandsOnly
    ? trimmed.slice(COMMANDS_ONLY_PREFIX.length)
    : trimmed;
  const terms = normalizeForSearch(text).split(/\s+/u).filter(Boolean);
  return { terms, commandsOnly };
};

export const isSearching = (query: ParsedQuery): boolean =>
  query.terms.length > 0;

const COMMAND_KINDS: ReadonlySet<CommandKind> = new Set(["navigate", "action"]);

export const isCommandKind = (command: Command): boolean =>
  COMMAND_KINDS.has(command.kind);

/** Label match strengths, strongest first. */
export const LABEL_SCORES = {
  exact: 100,
  prefix: 80,
  wordPrefix: 60,
  substring: 40,
  subsequence: 10,
} as const;

/** Hint / keyword match strengths. */
export const SECONDARY_SCORES = {
  prefix: 30,
  wordPrefix: 25,
  substring: 15,
} as const;

const WORD_BREAK = /[\s\-_:./·,()]+/u;

/** A normalised text and its words, computed once per command. */
interface SearchField {
  readonly text: string;
  readonly words: ReadonlyArray<string>;
}

const toField = (raw: string): SearchField => {
  const text = normalizeForSearch(raw);
  return { text, words: text.split(WORD_BREAK).filter(Boolean) };
};

/** A command with its searchable text pre-normalised. */
export interface IndexedCommand {
  readonly command: Command;
  readonly label: SearchField;
  readonly secondary: ReadonlyArray<SearchField>;
}

/**
 * Normalise every searchable field once, so a keystroke only scores.
 * Hints of node and conversation rows ("3 unread", "5 min ago") change
 * with live data and are not matched; their stable words are keywords.
 */
export const indexCommand = (command: Command): IndexedCommand => {
  const hint = isCommandKind(command) ? command.hint : undefined;
  return {
    command,
    label: toField(command.label),
    secondary: [hint, ...(command.keywords ?? [])]
      .filter((field): field is string => typeof field === "string")
      .map(toField),
  };
};

export const indexCommands = (
  commands: ReadonlyArray<Command>,
): ReadonlyArray<IndexedCommand> => commands.map(indexCommand);

/** Every code point of `term` appears in `text`, in order. */
export const isSubsequence = (term: string, text: string): boolean => {
  const wanted = Array.from(term);
  let at = 0;
  for (const char of text) {
    if (at === wanted.length) {
      break;
    }
    if (char === wanted[at]) {
      at += 1;
    }
  }
  return at === wanted.length;
};

const scoreLabel = (term: string, label: SearchField): number => {
  if (label.text === term) {
    return LABEL_SCORES.exact;
  }
  if (label.text.startsWith(term)) {
    return LABEL_SCORES.prefix;
  }
  if (label.words.some((word) => word.startsWith(term))) {
    return LABEL_SCORES.wordPrefix;
  }
  if (label.text.includes(term)) {
    return LABEL_SCORES.substring;
  }
  // Fuzzy matches only for terms long enough not to match everything.
  if (Array.from(term).length >= 3 && isSubsequence(term, label.text)) {
    return LABEL_SCORES.subsequence;
  }
  return 0;
};

const scoreSecondary = (term: string, field: SearchField): number => {
  if (field.text.startsWith(term)) {
    return SECONDARY_SCORES.prefix;
  }
  if (field.words.some((word) => word.startsWith(term))) {
    return SECONDARY_SCORES.wordPrefix;
  }
  if (field.text.includes(term)) {
    return SECONDARY_SCORES.substring;
  }
  return 0;
};

/**
 * Relevance of a command for `terms`: the sum over terms of each term's
 * best field match. Every term must match somewhere; otherwise 0.
 */
export const scoreIndexed = (
  entry: IndexedCommand,
  terms: ReadonlyArray<string>,
): number => {
  let total = 0;
  for (const term of terms) {
    let best = scoreLabel(term, entry.label);
    for (const field of entry.secondary) {
      best = Math.max(best, scoreSecondary(term, field));
    }
    if (best === 0) {
      return 0;
    }
    total += best;
  }
  return total;
};

/** Convenience for one-off scoring (tests, small lists). */
export const scoreCommand = (
  command: Command,
  terms: ReadonlyArray<string>,
): number => scoreIndexed(indexCommand(command), terms);
