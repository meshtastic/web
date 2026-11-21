import {
  nextGridIndex,
  PICKER_COLUMNS,
  pickerEmoji,
} from "@core/messaging/emojiPicker.ts";
import { type KeyboardEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export interface EmojiPickerProps {
  onPick: (emoji: string) => void;
}

/**
 * Curated grid of reaction emoji behind "More reactions". Arrow keys move
 * through it (one tab stop); Enter or click picks.
 */
export const EmojiPicker = ({ onPick }: EmojiPickerProps) => {
  const { t } = useTranslation("messages");
  const [focused, setFocused] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const next = nextGridIndex(
      focused,
      event.key,
      PICKER_COLUMNS,
      pickerEmoji.length,
    );
    if (next === undefined) {
      return;
    }
    event.preventDefault();
    setFocused(next);
    buttons.current[next]?.focus();
  };

  return (
    <fieldset className="m-0 grid min-w-0 grid-cols-8 gap-0.5 border-0 p-0">
      <legend className="sr-only">{t("bubble.pickReaction")}</legend>
      {pickerEmoji.map((emoji, i) => (
        <button
          key={emoji}
          ref={(el) => {
            buttons.current[i] = el;
          }}
          type="button"
          tabIndex={i === focused ? 0 : -1}
          aria-label={t("bubble.reactWith", { name: emoji })}
          onFocus={() => setFocused(i)}
          onKeyDown={onKeyDown}
          onClick={() => onPick(emoji)}
          className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-title hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <span aria-hidden="true">{emoji}</span>
        </button>
      ))}
    </fieldset>
  );
};
