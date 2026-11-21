/**
 * Scroll decisions for the message list, kept pure so the component only
 * reads and writes `scrollTop`.
 */

/** Within this many pixels of the end still counts as "at the bottom". */
export const BOTTOM_THRESHOLD_PX = 48;
/** Start loading older history this close to the top. */
export const TOP_THRESHOLD_PX = 120;

export interface ScrollMetrics {
  readonly scrollTop: number;
  readonly scrollHeight: number;
  readonly clientHeight: number;
}

export const distanceFromBottom = (m: ScrollMetrics): number =>
  Math.max(0, m.scrollHeight - m.clientHeight - m.scrollTop);

export const isAtBottom = (
  m: ScrollMetrics,
  threshold: number = BOTTOM_THRESHOLD_PX,
): boolean => distanceFromBottom(m) <= threshold;

export type NewMessagesDecision =
  /** Scroll to the end so the new message is visible. */
  | { readonly kind: "stick" }
  /** The reader is up in history: offer a "new messages" button instead. */
  | { readonly kind: "notify"; readonly count: number }
  | { readonly kind: "none" };

export interface NewMessagesInput {
  /** Whether the list was at the bottom before the messages arrived. */
  readonly wasAtBottom: boolean;
  /** Messages appended at the end since the last render. */
  readonly appended: number;
  /** The last appended message is one I sent. */
  readonly lastIsMine: boolean;
  /** Unseen appended messages already counted by an earlier notify. */
  readonly pending: number;
}

/** What to do when messages are appended (not when older ones load). */
export const decideOnAppend = (
  input: NewMessagesInput,
): NewMessagesDecision => {
  if (input.appended <= 0) {
    return { kind: "none" };
  }
  if (input.wasAtBottom || input.lastIsMine) {
    return { kind: "stick" };
  }
  return { kind: "notify", count: input.pending + input.appended };
};

export interface ListChange {
  /** Number of entries added before the previous first one. */
  readonly prepended: number;
  /** Number of entries added after the previous last one. */
  readonly appended: number;
  /** The list was replaced (conversation switch, first load). */
  readonly reset: boolean;
}

/**
 * How a list of keys changed between renders, by where the old first and
 * last keys sit in the new list.
 */
export const diffList = (
  previous: readonly string[],
  next: readonly string[],
): ListChange => {
  if (previous.length === 0) {
    return { prepended: 0, appended: 0, reset: next.length > 0 };
  }
  const first = previous[0];
  const last = previous.at(-1);
  const firstAt = first === undefined ? -1 : next.indexOf(first);
  const lastAt = last === undefined ? -1 : next.lastIndexOf(last);
  if (firstAt < 0 || lastAt < 0 || lastAt < firstAt) {
    return { prepended: 0, appended: 0, reset: true };
  }
  return {
    prepended: firstAt,
    appended: next.length - 1 - lastAt,
    reset: false,
  };
};

/**
 * `scrollTop` that keeps the same content in view after older history was
 * inserted above it.
 */
export const preservedScrollTop = (
  previousScrollTop: number,
  previousScrollHeight: number,
  nextScrollHeight: number,
): number =>
  Math.max(0, previousScrollTop + (nextScrollHeight - previousScrollHeight));

export interface LoadOlderInput {
  readonly scrollTop: number;
  readonly loading: boolean;
  /** A previous load returned nothing: the start of history. */
  readonly exhausted: boolean;
  readonly threshold?: number;
}

export const shouldLoadOlder = (input: LoadOlderInput): boolean =>
  !input.loading &&
  !input.exhausted &&
  input.scrollTop <= (input.threshold ?? TOP_THRESHOLD_PX);
