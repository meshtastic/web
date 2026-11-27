import {
  evaluateTextLimit,
  type TextLimitSpec,
} from "@core/utils/textLimit.ts";

/** A chat message's text limit: 200 UTF-8 bytes, the radio's storage limit. */
/** Counted the way it is sent: surrounding whitespace is trimmed. */
export const CHAT_TEXT_LIMIT: TextLimitSpec = {
  max: 200,
  mode: "bytes",
  trim: true,
};

export interface ComposerStatus {
  readonly used: number;
  readonly over: boolean;
  /** Something to send (not only whitespace) and within the limit. */
  readonly canSend: boolean;
}

export const composerStatus = (
  text: string,
  limit: TextLimitSpec = CHAT_TEXT_LIMIT,
): ComposerStatus => {
  const { used, over } = evaluateTextLimit(text, limit);
  return { used, over, canSend: !over && text.trim().length > 0 };
};

export interface ComposerKey {
  readonly key: string;
  readonly shiftKey: boolean;
  /** An IME composition is in progress: Enter confirms it, not the message. */
  readonly isComposing: boolean;
  readonly replying: boolean;
  /** The @mention suggestions are showing. */
  readonly mentionOpen?: boolean;
}

export type ComposerKeyAction =
  | "send"
  | "cancelReply"
  | "mentionNext"
  | "mentionPrevious"
  | "mentionPick"
  | "mentionClose"
  | "default";

const mentionKeys: Readonly<Record<string, ComposerKeyAction>> = {
  ArrowDown: "mentionNext",
  ArrowUp: "mentionPrevious",
  Enter: "mentionPick",
  Tab: "mentionPick",
  Escape: "mentionClose",
};

/**
 * Enter sends, Shift+Enter inserts a newline (the textarea's default),
 * Escape cancels a reply. While @mention suggestions show, the arrows
 * move through them, Enter or Tab picks one and Escape closes them
 * (leaving the reply alone).
 */
export const composerKeyAction = (input: ComposerKey): ComposerKeyAction => {
  if (input.isComposing) {
    return "default";
  }
  if (input.mentionOpen && !input.shiftKey) {
    const action = mentionKeys[input.key];
    if (action) {
      return action;
    }
  }
  if (input.key === "Enter" && !input.shiftKey) {
    return "send";
  }
  if (input.key === "Escape" && input.replying) {
    return "cancelReply";
  }
  return "default";
};

export type EmojiInsertResult =
  | { readonly ok: true; readonly text: string; readonly caret: number }
  | { readonly ok: false; readonly reason: "tooLong" };

/**
 * `emoji` typed into `text` over the selection `start`..`end` (a caret
 * when they match), with the caret after it. Refused when the result
 * would go over the limit, so an emoji is never half in.
 */
export const insertEmoji = (
  text: string,
  start: number,
  end: number,
  emoji: string,
  limit: TextLimitSpec = CHAT_TEXT_LIMIT,
): EmojiInsertResult => {
  const clamp = (i: number) => Math.min(Math.max(i, 0), text.length);
  const from = clamp(Math.min(start, end));
  const to = clamp(Math.max(start, end));
  const next = text.slice(0, from) + emoji + text.slice(to);
  if (evaluateTextLimit(next, limit).over) {
    return { ok: false, reason: "tooLong" };
  }
  return { ok: true, text: next, caret: from + emoji.length };
};

export interface ComposerEmojiPick {
  /** A reply is open in the composer. */
  readonly replying: boolean;
  /** "Send as tapback" is on (it starts on for each reply). */
  readonly tapbackMode: boolean;
  /** The picker's quick row, or its grid and search results. */
  readonly source: "quick" | "grid";
}

/**
 * What an emoji picked from the composer's picker does. Without a reply it
 * goes into the text. While replying, the quick row ("Tapback to NAME")
 * always sends a tapback on the message being replied to; the grid does
 * too while "Send as tapback" is on, and goes into the text when it's off.
 */
export const composerEmojiAction = (
  pick: ComposerEmojiPick,
): "insert" | "tapback" => {
  if (!pick.replying) {
    return "insert";
  }
  if (pick.source === "quick" || pick.tapbackMode) {
    return "tapback";
  }
  return "insert";
};
