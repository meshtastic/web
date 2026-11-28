import { formatNodeId } from "@core/utils/nodeIdentity.ts";

/**
 * @mentions. On the wire a mention is the literal text `@!<hex>`, the
 * node's id (`@!ffccee11`), never its name: it stays resolvable when the
 * name changes, and every client (Android, iOS, web) parses the same text
 * (meshtastic/design#21). Names are only ever substituted for display.
 */

/**
 * The wire token, as on Android (`MENTION_TOKEN_REGEX`): `@`, `!` and
 * exactly eight hex digits not followed by another hex digit, so
 * `@!ffccee11a` (a longer id) is not a mention. Group 1 is the `!hex` id.
 */
const MENTION_TOKEN_SOURCE = "@(![0-9a-fA-F]{8})(?![0-9a-fA-F])";

/** A fresh global regex for the token (global regexes carry state). */
export const mentionTokenRegex = (): RegExp =>
  new RegExp(MENTION_TOKEN_SOURCE, "gu");

/** How many suggestions the composer offers, as on Android. */
export const MENTION_SUGGESTION_LIMIT = 5;

/** The wire token for a node: `@!ffccee11`. */
export const mentionToken = (nodeNum: number): string =>
  `@${formatNodeId(nodeNum)}`;

export type MentionSegment =
  | { readonly kind: "text"; readonly text: string }
  | {
      readonly kind: "mention";
      readonly nodeNum: number;
      /** The token as written, e.g. `@!FFCCEE11`. */
      readonly raw: string;
    };

/** `text` split into plain runs and mention tokens, in order. */
export const parseMentions = (text: string): MentionSegment[] => {
  const segments: MentionSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(mentionTokenRegex())) {
    const id = match[1] ?? "";
    if (match.index > cursor) {
      segments.push({ kind: "text", text: text.slice(cursor, match.index) });
    }
    segments.push({
      kind: "mention",
      nodeNum: Number.parseInt(id.slice(1), 16) >>> 0,
      raw: match[0],
    });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) {
    segments.push({ kind: "text", text: text.slice(cursor) });
  }
  return segments;
};

/**
 * Whether `text` mentions the node with user id `userId` (`!ffccee11`).
 * Ids compare case-insensitively and honour the token boundary, as on
 * Android (`textMentionsNode`).
 */
export const textMentionsNode = (
  text: string | null | undefined,
  userId: string,
): boolean => {
  if (!text || userId.length <= 1) {
    return false;
  }
  const wanted = userId.toLowerCase();
  for (const match of text.matchAll(mentionTokenRegex())) {
    if (match[1]?.toLowerCase() === wanted) {
      return true;
    }
  }
  return false;
};

/**
 * A node's name for its mentions: the long name, else the short name;
 * undefined for a node we know no name for, whose mention shows the raw
 * token.
 */
export type MentionName = (nodeNum: number) => string | undefined;

/** Knows no names: every mention shows its raw token. */
export const NO_MENTION_NAMES: MentionName = () => undefined;

/** The name a mention shows, or undefined to show the raw token. */
export const mentionLabel = (names: {
  readonly longName?: string;
  readonly shortName?: string;
}): string | undefined =>
  names.longName?.trim() || names.shortName?.trim() || undefined;

/** The text with each known mention as `@Name` (previews, copy, speech). */
export const mentionsToText = (text: string, name: MentionName): string =>
  text.includes("@")
    ? parseMentions(text)
        .map((segment) => {
          if (segment.kind === "text") {
            return segment.text;
          }
          const label = name(segment.nodeNum);
          return label === undefined ? segment.raw : `@${label}`;
        })
        .join("")
    : text;

/** An `@query` being typed: `text.slice(start, end)` is `@` + `query`. */
export interface MentionQuery {
  readonly start: number;
  readonly end: number;
  readonly query: string;
}

const isWhitespace = (char: string | undefined): boolean =>
  char !== undefined && /\s/u.test(char);

/**
 * The mention being typed at the caret, as on Android: the nearest `@`
 * before a collapsed caret that starts a word (at the start or after
 * whitespace), followed by nothing but non-whitespace up to the caret.
 */
export const currentMentionQuery = (
  text: string,
  selectionStart: number,
  selectionEnd: number = selectionStart,
): MentionQuery | undefined => {
  if (selectionStart !== selectionEnd || selectionStart <= 0) {
    return undefined;
  }
  const caret = Math.min(selectionStart, text.length);
  const at = text.lastIndexOf("@", caret - 1);
  if (at < 0) {
    return undefined;
  }
  if (at > 0 && !isWhitespace(text[at - 1])) {
    return undefined;
  }
  const query = text.slice(at + 1, caret);
  if (/\s/u.test(query)) {
    return undefined;
  }
  return { start: at, end: caret, query };
};

/** A node the composer can suggest. */
export interface MentionCandidate {
  readonly num: number;
  /** `!ffccee11`. */
  readonly id: string;
  readonly longName?: string;
  readonly shortName?: string;
}

const matchesQuery = (candidate: MentionCandidate, query: string): boolean =>
  (candidate.longName ?? "").toLowerCase().includes(query) ||
  (candidate.shortName ?? "").toLowerCase().includes(query) ||
  candidate.id.toLowerCase().includes(query);

/**
 * Up to `limit` candidates whose long name, short name or id contains
 * `query` (case-insensitive), in the order given; the first `limit` for an
 * empty query. Android's `matchingMentionCandidates`.
 */
export const matchMentionCandidates = <T extends MentionCandidate>(
  candidates: readonly T[],
  query: string,
  limit: number = MENTION_SUGGESTION_LIMIT,
): T[] => {
  if (limit <= 0) {
    return [];
  }
  const wanted = query.toLowerCase();
  const out: T[] = [];
  for (const candidate of candidates) {
    if (out.length >= limit) {
      break;
    }
    if (wanted === "" || matchesQuery(candidate, wanted)) {
      out.push(candidate);
    }
  }
  return out;
};

// ---------------------------------------------------------------------------
// The composer's text. A textarea can only show the text it holds, so the
// field holds friendly text (`@Alice`) while the draft and the sent message
// hold the wire text (`@!ffccee11`). The wire text is the source of truth:
// the field's text and the mentions in it are derived from it, and each
// edit of the field is mapped back onto it.
// ---------------------------------------------------------------------------

/** A mention in the field's text: `display.slice(start, end)` shows it. */
export interface MentionRange {
  readonly start: number;
  readonly end: number;
  readonly nodeNum: number;
  /** What it is on the wire. */
  readonly token: string;
}

export interface ComposerText {
  readonly wire: string;
  /** What the field shows. */
  readonly display: string;
  /** In order, never overlapping. */
  readonly ranges: readonly MentionRange[];
}

/** The field's text for `wire`: each token as `@Name` (raw when unknown). */
export const composerText = (wire: string, name: MentionName): ComposerText => {
  if (!wire.includes("@")) {
    return { wire, display: wire, ranges: [] };
  }
  let display = "";
  const ranges: MentionRange[] = [];
  for (const segment of parseMentions(wire)) {
    if (segment.kind === "text") {
      display += segment.text;
      continue;
    }
    const label = name(segment.nodeNum);
    const shown = label === undefined ? segment.raw : `@${label}`;
    ranges.push({
      start: display.length,
      end: display.length + shown.length,
      nodeNum: segment.nodeNum,
      token: segment.raw,
    });
    display += shown;
  }
  return { wire, display, ranges };
};

/** `display` with each range replaced by its token. */
const toWire = (display: string, ranges: readonly MentionRange[]): string => {
  let wire = "";
  let cursor = 0;
  for (const range of ranges) {
    wire += display.slice(cursor, range.start) + range.token;
    cursor = range.end;
  }
  return wire + display.slice(cursor);
};

/** A position in the field's text, as a position in the wire text. */
export const displayToWireOffset = (
  text: ComposerText,
  offset: number,
): number => {
  let delta = 0;
  for (const range of text.ranges) {
    if (offset <= range.start) {
      break;
    }
    if (offset < range.end) {
      // Inside a mention: it is all or nothing, so snap past it.
      return range.start + delta + range.token.length;
    }
    delta += range.token.length - (range.end - range.start);
  }
  return offset + delta;
};

/** A position in the wire text, as a position in the field's text. */
export const wireToDisplayOffset = (
  text: ComposerText,
  offset: number,
): number => {
  let delta = 0;
  for (const range of text.ranges) {
    const wireStart = range.start + delta;
    if (offset <= wireStart) {
      break;
    }
    if (offset < wireStart + range.token.length) {
      return range.end;
    }
    delta += range.token.length - (range.end - range.start);
  }
  return offset - delta;
};

interface TextChange {
  /** Replaced span of the old text. */
  readonly start: number;
  readonly end: number;
  readonly inserted: string;
}

/**
 * The one span that changed from `before` to `after`. The edit ends at the
 * caret, which settles otherwise ambiguous diffs: typing `e` inside
 * `@Anne` (giving `@Annee`) is an edit inside the mention, not after it.
 */
const diffText = (before: string, after: string, caret: number): TextChange => {
  const maxSuffix = Math.max(
    0,
    Math.min(before.length, after.length - Math.min(caret, after.length)),
  );
  let suffix = 0;
  while (
    suffix < maxSuffix &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  ) {
    suffix++;
  }
  const maxPrefix = Math.min(before.length, after.length) - suffix;
  let prefix = 0;
  while (prefix < maxPrefix && before[prefix] === after[prefix]) {
    prefix++;
  }
  return {
    start: prefix,
    end: before.length - suffix,
    inserted: after.slice(prefix, after.length - suffix),
  };
};

const isHexDigit = (char: string | undefined): boolean =>
  char !== undefined && /[0-9a-fA-F]/u.test(char);

/**
 * The mentions left after the field's text went from `text.display` to
 * `next` (caret at `caret` after the edit), in `next`'s coordinates.
 * Mentions the edit didn't touch are kept; one it touched (typed inside,
 * partly deleted) is no longer a mention and its name stays as plain
 * text. A mention now followed by a hex digit is dropped the same way,
 * since on the wire that digit would make a different, longer id.
 */
const keptRanges = (
  text: ComposerText,
  next: string,
  caret: number,
): MentionRange[] => {
  if (text.ranges.length === 0) {
    return [];
  }
  const change = diffText(text.display, next, caret);
  const delta = change.inserted.length - (change.end - change.start);
  const kept: MentionRange[] = [];
  for (const range of text.ranges) {
    if (range.end <= change.start) {
      kept.push(range);
    } else if (range.start >= change.end) {
      kept.push({
        ...range,
        start: range.start + delta,
        end: range.end + delta,
      });
    }
  }
  return kept.filter((range) => !isHexDigit(next[range.end]));
};

/** The wire text once the field's text is `next` (see `keptRanges`). */
export const applyComposerEdit = (
  text: ComposerText,
  next: string,
  caret: number,
): string => toWire(next, keptRanges(text, next, caret));

export interface ComposerEditResult {
  readonly wire: string;
  /** Caret in the wire text; map it with `wireToDisplayOffset`. */
  readonly caret: number;
}

/**
 * Backspace or Delete over a mention takes the whole mention: with a
 * collapsed caret just after (Backspace) or before (Delete) or inside one,
 * or a selection that cuts into one (widened to cover it). Undefined when
 * no mention is involved, so the field's own editing applies.
 */
export const deleteMention = (
  text: ComposerText,
  selectionStart: number,
  selectionEnd: number,
  direction: "backward" | "forward",
): ComposerEditResult | undefined => {
  let from = Math.min(selectionStart, selectionEnd);
  let to = Math.max(selectionStart, selectionEnd);
  let hit = false;
  for (const range of text.ranges) {
    const touches =
      from === to
        ? direction === "backward"
          ? range.start < from && from <= range.end
          : range.start <= from && from < range.end
        : range.start < to && range.end > from;
    if (touches) {
      hit = true;
      from = Math.min(from, range.start);
      to = Math.max(to, range.end);
    }
  }
  if (!hit) {
    return undefined;
  }
  const next = text.display.slice(0, from) + text.display.slice(to);
  const ranges = keptRanges(text, next, from);
  const wire = toWire(next, ranges);
  return {
    wire,
    caret: displayToWireOffset({ wire, display: next, ranges }, from),
  };
};

/**
 * Completes the `@query` with a mention of `nodeNum`: the token, then a
 * space unless one follows already, with the caret after that space.
 */
export const insertMention = (
  text: ComposerText,
  query: MentionQuery,
  nodeNum: number,
): ComposerEditResult => {
  const start = displayToWireOffset(text, query.start);
  const end = displayToWireOffset(text, query.end);
  const token = mentionToken(nodeNum);
  const spaced = isWhitespace(text.wire[end]) ? token : `${token} `;
  return {
    wire: text.wire.slice(0, start) + spaced + text.wire.slice(end),
    caret: start + token.length + 1,
  };
};

/**
 * The mention being typed at the caret, unless the `@` belongs to a
 * mention already in the field (whose name would otherwise read as a
 * query).
 */
export const composerMentionQuery = (
  text: ComposerText,
  selectionStart: number,
  selectionEnd: number,
): MentionQuery | undefined => {
  const query = currentMentionQuery(text.display, selectionStart, selectionEnd);
  if (!query) {
    return undefined;
  }
  const insideMention = text.ranges.some(
    (range) => range.start < query.end && range.end > query.start,
  );
  return insideMention ? undefined : query;
};
