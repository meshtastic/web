import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSearch,
} from "@shared/components/ui/emoji-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@shared/components/ui/popover";
import { cn } from "@shared/utils/cn";
import type { Emoji } from "frimousse";
import { Smile } from "lucide-react";
import { forwardRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ReactionService } from "../services/ReactionService.ts";

interface EmojiReactionButtonProps {
  onEmojiSelect?: (emoji: string) => void;
  className?: string;
}

export const EmojiReactionButton = forwardRef<
  HTMLButtonElement,
  EmojiReactionButtonProps
>(function EmojiReactionButton({ onEmojiSelect, className }, ref) {
  const { t } = useTranslation("messages");
  const [open, setOpen] = useState(false);

  const recentEmojis = ReactionService.getRecentEmojis();

  const handleEmojiSelect = (emoji: Emoji) => {
    onEmojiSelect?.(emoji.emoji);
    setOpen(false);
  };

  const handleQuickReaction = (emoji: string) => {
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
          <Smile className="size-4.5 opacity-90" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-fit p-0"
        side="top"
        align="start"
        sideOffset={8}
      >
        {/* Quick reactions bar */}
        <div className="flex gap-1 p-2 border-b border-border">
          {recentEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleQuickReaction(emoji)}
              className="text-xl p-1 hover:bg-accent rounded transition-colors"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Full emoji picker */}
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
