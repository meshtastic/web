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
}

export type ComposerKeyAction = "send" | "cancelReply" | "default";

/**
 * Enter sends, Shift+Enter inserts a newline (the textarea's default),
 * Escape cancels a reply.
 */
export const composerKeyAction = (input: ComposerKey): ComposerKeyAction => {
  if (input.isComposing) {
    return "default";
  }
  if (input.key === "Enter" && !input.shiftKey) {
    return "send";
  }
  if (input.key === "Escape" && input.replying) {
    return "cancelReply";
  }
  return "default";
};
