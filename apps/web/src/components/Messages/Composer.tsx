import { LimitCounter } from "@components/UI/LimitCounter.tsx";
import { Switch } from "@components/UI/Switch.tsx";
import {
  CHAT_TEXT_LIMIT,
  composerEmojiAction,
  composerKeyAction,
  composerStatus,
  insertEmoji,
} from "@core/messaging/composer.ts";
import { cn } from "@core/utils/cn.ts";
import { SendIcon, SmileIcon } from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  type Ref,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { type EmojiPickSource, EmojiPickerPopover } from "./EmojiPicker.tsx";
import { ReplyPreview } from "./ReplyPreview.tsx";
import type { EmojiPrefs } from "./useEmoji.ts";

export interface ComposerReply {
  /** Author of the message being replied to ("yourself" for mine). */
  readonly name: string;
  readonly excerpt: string;
}

export interface ComposerProps {
  /** Accessible name, e.g. "Message Primary". */
  label: string;
  placeholder: string;
  /** Help line under the field (keys, hop limit, encryption). */
  hint?: string;
  /** The draft; persisted per conversation by the caller. */
  value: string;
  onChange: (text: string) => void;
  /** Called with the trimmed text; the caller clears the draft. */
  onSend: (text: string) => void;
  disabled?: boolean;
  replying?: ComposerReply;
  onCancelReply: () => void;
  /** Quick row and memory for the emoji picker. */
  emoji: EmojiPrefs;
  /**
   * Send `emoji` as a tapback on the message being replied to (and end
   * the reply). Called only while replying.
   */
  onTapback: (emoji: string) => void;
  /** Narrow layout: pill field, round send button. */
  touch?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

/** Grows with its text up to about six lines, then scrolls. */
const MAX_HEIGHT_PX = 160;

/**
 * Message field: UTF-8 byte counter against 200 (red and blocking once
 * over), Enter to send, Shift+Enter for a newline, Esc to cancel a reply,
 * and the reply strip above it. The emoji button opens the picker: its
 * emoji go in at the caret (refused when they'd go over 200 bytes), or,
 * while replying, go as a tapback on that message (see
 * `composerEmojiAction`).
 */
export const Composer = ({
  label,
  placeholder,
  hint,
  value,
  onChange,
  onSend,
  disabled = false,
  replying,
  onCancelReply,
  emoji,
  onTapback,
  touch = false,
  ref,
}: ComposerProps) => {
  const { t } = useTranslation("messages");
  const fieldId = useId();
  const counterId = useId();
  const hintId = useId();
  const tapbackId = useId();
  const field = useRef<HTMLTextAreaElement | null>(null);
  const status = composerStatus(value);
  const canSend = status.canSend && !disabled;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notice, setNotice] = useState<string | undefined>(undefined);
  // "Send as tapback" starts on for each reply.
  const replyKey = replying ? `${replying.name}\n${replying.excerpt}` : "";
  const [tapback, setTapback] = useState({ key: "", on: true });
  const tapbackMode = tapback.key === replyKey ? tapback.on : true;
  // Caret to restore once an inserted emoji is in the field.
  const pendingCaret = useRef<number | undefined>(undefined);
  // The picker closed because of a pick: focus goes to the field, not
  // back to the emoji button.
  const picked = useRef(false);

  useLayoutEffect(() => {
    const caret = pendingCaret.current;
    const el = field.current;
    if (caret === undefined || !el) {
      return;
    }
    pendingCaret.current = undefined;
    el.focus();
    el.setSelectionRange(caret, caret);
  }, [value]);

  const closePicker = () => {
    picked.current = true;
    setNotice(undefined);
    setPickerOpen(false);
  };

  const onPickEmoji = (choice: string, source: EmojiPickSource): boolean => {
    const action = composerEmojiAction({
      replying: replying !== undefined,
      tapbackMode,
      source,
    });
    if (action === "tapback") {
      closePicker();
      onTapback(choice);
      return true;
    }
    const el = field.current;
    const result = insertEmoji(
      value,
      el?.selectionStart ?? value.length,
      el?.selectionEnd ?? value.length,
      choice,
    );
    if (!result.ok) {
      setNotice(t("emojiPicker.noRoom"));
      return false;
    }
    closePicker();
    pendingCaret.current = result.caret;
    onChange(result.text);
    return true;
  };

  useLayoutEffect(() => {
    const el = field.current;
    if (!el) {
      return;
    }
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value]);

  const send = () => {
    if (!canSend) {
      return;
    }
    onSend(value.trim());
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const action = composerKeyAction({
      key: event.key,
      shiftKey: event.shiftKey,
      // Safari reports the Enter that confirms a composition with keyCode 229.
      isComposing:
        event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229,
      replying: replying !== undefined,
    });
    if (action === "send") {
      event.preventDefault();
      send();
    } else if (action === "cancelReply") {
      event.preventDefault();
      onCancelReply();
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "flex shrink-0 flex-col gap-1.5 border-t border-subtle",
        // The composer is the bottom edge on phones: clear the home indicator.
        touch
          ? "bg-surface px-2 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          : // Bottom gap matches the device card's, so the input box
            // lines up with it across the sidebar.
            "px-5 pt-3 pb-2",
      )}
    >
      {replying ? (
        <ReplyPreview
          name={replying.name}
          excerpt={replying.excerpt}
          onCancel={onCancelReply}
        />
      ) : null}
      <div
        className={cn(
          "flex items-center gap-2",
          !touch &&
            "rounded-panel border border-control bg-app py-1.5 pr-1.5 pl-3 focus-within:border-accent",
        )}
      >
        <div
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2",
            touch &&
              "min-h-11 rounded-[22px] bg-raised px-3.5 focus-within:outline-2 focus-within:outline-focus",
          )}
        >
          <label htmlFor={fieldId} className="sr-only">
            {label}
          </label>
          <textarea
            id={fieldId}
            ref={(el) => {
              field.current = el;
              if (typeof ref === "function") {
                ref(el);
              } else if (ref) {
                ref.current = el;
              }
            }}
            rows={1}
            value={value}
            disabled={disabled}
            placeholder={placeholder}
            autoComplete="off"
            enterKeyHint="send"
            aria-invalid={status.over || undefined}
            aria-describedby={[counterId, hint ? hintId : undefined]
              .filter(Boolean)
              .join(" ")}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            className={cn(
              "min-w-0 flex-1 resize-none border-0 bg-transparent py-2.5 leading-5 text-primary outline-none placeholder:text-muted disabled:cursor-not-allowed",
              touch ? "text-base" : "text-header",
            )}
          />
          <LimitCounter
            id={counterId}
            value={value}
            limit={CHAT_TEXT_LIMIT}
            className="shrink-0"
          />
          <EmojiPickerPopover
            open={pickerOpen}
            onOpenChange={(open) => {
              setPickerOpen(open);
              setNotice(undefined);
            }}
            label={t("emojiPicker.label")}
            prefs={emoji}
            {...(replying
              ? {
                  quickLabel: t("emojiPicker.tapbackTo", {
                    name: replying.name,
                  }),
                  header: (
                    <div className="flex items-center gap-3 rounded-control border-l-[3px] border-accent bg-inset py-2 pr-2 pl-3">
                      <label
                        htmlFor={tapbackId}
                        className="flex min-w-0 flex-1 cursor-pointer flex-col gap-px"
                      >
                        <span className="text-body font-semibold text-primary">
                          {t("emojiPicker.sendAsTapback")}
                        </span>
                        <span className="text-meta text-secondary">
                          {tapbackMode
                            ? t("emojiPicker.tapbackOn", {
                                name: replying.name,
                              })
                            : t("emojiPicker.tapbackOff")}
                        </span>
                      </label>
                      <Switch
                        id={tapbackId}
                        checked={tapbackMode}
                        onCheckedChange={(on) =>
                          setTapback({ key: replyKey, on })
                        }
                      />
                    </div>
                  ),
                }
              : {})}
            {...(notice ? { notice } : {})}
            onPick={onPickEmoji}
            onCloseAutoFocus={(event) => {
              if (picked.current) {
                picked.current = false;
                event.preventDefault();
                field.current?.focus();
              }
            }}
          >
            <button
              type="button"
              aria-label={t("composer.emoji")}
              disabled={disabled}
              className="relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted pointer-coarse:touch-target hover:bg-raised hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:bg-raised data-[state=open]:text-primary"
            >
              <SmileIcon aria-hidden="true" className="size-5" />
            </button>
          </EmojiPickerPopover>
        </div>
        <button
          type="submit"
          aria-label={t("composer.send")}
          title={hint && !touch ? hint : undefined}
          disabled={!canSend}
          className={cn(
            "flex size-11 shrink-0 cursor-pointer items-center justify-center bg-accent text-on-accent transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50",
            touch ? "rounded-full" : "rounded-card",
          )}
        >
          <SendIcon aria-hidden="true" className="size-5" />
        </button>
      </div>
      {hint ? (
        <span id={hintId} className="sr-only">
          {hint}
        </span>
      ) : null}
    </form>
  );
};
