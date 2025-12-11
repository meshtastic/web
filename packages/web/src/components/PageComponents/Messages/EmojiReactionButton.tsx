import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSearch,
} from "@components/ui/emoji-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover";
import { cn } from "@core/utils/cn";
import type { Emoji } from "frimousse";
import { SmilePlus } from "lucide-react";
import { forwardRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface EmojiReactionButtonProps {
  onEmojiSelect?: (emoji: Emoji) => void;
  className?: string;
}

export const EmojiReactionButton = forwardRef<
  HTMLButtonElement,
  EmojiReactionButtonProps
>(function EmojiReactionButton({ onEmojiSelect, className }, ref) {
  const { t } = useTranslation("messages");
  const [open, setOpen] = useState(false);

  const handleEmojiSelect = (emoji: Emoji) => {
    onEmojiSelect?.(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={ref}
          type="button"
          className={cn(
            "p-1 rounded transition-colors hover:bg-white/20",
            className,
          )}
          aria-label={t("actionsMenu.addReaction", "Add reaction")}
        >
          <SmilePlus className="size-4 opacity-80" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-fit p-0"
        side="top"
        align="start"
        sideOffset={8}
      >
        <EmojiPicker className="h-80" onEmojiSelect={handleEmojiSelect}>
          <EmojiPickerSearch
            placeholder={t("emojiPicker.search", "Search emoji...")}
          />
          <EmojiPickerContent />
          <EmojiPickerFooter />
        </EmojiPicker>
      </PopoverContent>
    </Popover>
  );
});
