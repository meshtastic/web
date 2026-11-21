import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/UI/DropdownMenu.tsx";
import { nextToolbarIndex } from "@core/messaging/emojiPicker.ts";
import type { MessageActionsAvailability } from "@core/messaging/messageListView.ts";
import { cn } from "@core/utils/cn.ts";
import {
  CopyIcon,
  InfoIcon,
  MoreHorizontalIcon,
  ReplyIcon,
  RotateCwIcon,
  SmilePlusIcon,
} from "lucide-react";
import {
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type Ref,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { EmojiPickerPopover } from "./EmojiPicker.tsx";
import type { EmojiPrefs } from "./useEmoji.ts";

export interface MessageActionsBarProps {
  available: MessageActionsAvailability;
  /** Which bubble corner it sits on: right for incoming, left for outgoing. */
  side: "start" | "end";
  /** Bigger targets for touch layouts. */
  touch?: boolean;
  /** Move focus into the bar when it opens from the keyboard. */
  focusOnOpen?: boolean;
  /** Quick row (the six most used emoji) and the picker's memory. */
  emoji: EmojiPrefs;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onCopy: () => void;
  onDeliveryDetails: () => void;
  onRetry: () => void;
  /** A popover or menu of the bar opened or closed (the bar must stay up). */
  onMenuOpenChange: (open: boolean) => void;
  /** Escape outside a menu: close the bar and return focus. */
  onDismiss: () => void;
  ref?: Ref<HTMLDivElement>;
}

type ToolButtonProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "aria-label" | "onFocus"
> & {
  label: string;
  touch: boolean;
  index: number;
  focused: number;
  register: (index: number, el: HTMLButtonElement | null) => void;
  onFocus: (index: number) => void;
  /** Set by a Radix trigger wrapping this button (asChild). */
  ref?: Ref<HTMLButtonElement>;
};

const assignRef = <T,>(ref: Ref<T> | undefined, value: T | null) => {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
};

const ToolButton = ({
  label,
  touch,
  index,
  focused,
  register,
  onFocus,
  className,
  ref,
  ...rest
}: ToolButtonProps) => (
  <button
    type="button"
    {...rest}
    ref={(el) => {
      register(index, el);
      assignRef(ref, el);
    }}
    aria-label={label}
    tabIndex={index === focused ? 0 : -1}
    onFocus={() => onFocus(index)}
    className={cn(
      "flex shrink-0 cursor-pointer items-center justify-center text-secondary hover:bg-raised hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus data-[state=open]:bg-raised",
      // Touch: full-height targets that share the row's width on a narrow
      // phone rather than run off its edge.
      touch
        ? "h-11 w-11 min-w-0 shrink rounded-full"
        : "size-[34px] rounded-lg",
      className,
    )}
  />
);

/**
 * Quick reactions (the six most used emoji, as on Android), the full emoji
 * picker, reply and more actions for one message. A toolbar: one tab
 * stop, arrow keys move between its buttons. Tapping a quick reaction
 * doesn't count as a use; picks in the picker do, as on Android.
 */
export const MessageActionsBar = ({
  available,
  side,
  touch = false,
  focusOnOpen = false,
  emoji,
  onReact,
  onReply,
  onCopy,
  onDeliveryDetails,
  onRetry,
  onMenuOpenChange,
  onDismiss,
  ref,
}: MessageActionsBarProps) => {
  const { t } = useTranslation("messages");
  const [focused, setFocused] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const picked = useRef(false);
  const register = (index: number, el: HTMLButtonElement | null) => {
    buttons.current[index] = el;
  };

  useEffect(() => {
    if (focusOnOpen) {
      buttons.current[0]?.focus();
    }
  }, [focusOnOpen]);

  const reactions = available.react ? emoji.quick : [];
  const moreIndex = reactions.length;
  // On touch the bar is Android's inline row: six emoji, the picker and
  // the menu (Reply is in the menu), so every target stays 44px wide on a
  // phone.
  const replyButton = available.reply && !touch;
  const replyIndex = available.react ? moreIndex + 1 : 0;
  const menuIndex = replyIndex + (replyButton ? 1 : 0);
  const count = menuIndex + 1;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !pickerOpen && !menuOpen) {
      event.stopPropagation();
      onDismiss();
      return;
    }
    const next = nextToolbarIndex(focused, event.key, count);
    if (next === undefined || pickerOpen || menuOpen) {
      return;
    }
    event.preventDefault();
    setFocused(next);
    buttons.current[next]?.focus();
  };

  const shared = { touch, focused, register, onFocus: setFocused };
  const iconClass = touch ? "size-5" : "size-[18px]";

  return (
    <div
      ref={ref}
      role="toolbar"
      tabIndex={-1}
      aria-label={t("bubble.actions")}
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      className={cn(
        "z-10 flex items-center gap-0.5 border border-elevated bg-surface p-1 shadow-popover",
        touch ? "max-w-full gap-0 rounded-full" : "rounded-card",
      )}
    >
      {reactions.map((reaction, i) => (
        <ToolButton
          key={reaction}
          {...shared}
          index={i}
          label={t("bubble.reactWith", { name: reaction })}
          onClick={() => onReact(reaction)}
        >
          <span aria-hidden="true" className="text-title leading-none">
            {reaction}
          </span>
        </ToolButton>
      ))}
      {available.react ? (
        <EmojiPickerPopover
          open={pickerOpen}
          onOpenChange={(open) => {
            setPickerOpen(open);
            onMenuOpenChange(open || menuOpen);
          }}
          label={t("bubble.pickReaction")}
          prefs={emoji}
          align="center"
          side="bottom"
          onCloseAutoFocus={(event) => {
            // A pick closes the whole bar; dismiss() puts focus back.
            if (picked.current) {
              picked.current = false;
              event.preventDefault();
            }
          }}
          onPick={(choice) => {
            picked.current = true;
            setPickerOpen(false);
            onMenuOpenChange(false);
            onReact(choice);
            onDismiss();
            return true;
          }}
        >
          <ToolButton
            {...shared}
            index={moreIndex}
            label={t("bubble.moreReactions")}
          >
            <SmilePlusIcon aria-hidden="true" className={iconClass} />
          </ToolButton>
        </EmojiPickerPopover>
      ) : null}
      {available.react && replyButton ? (
        <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-control" />
      ) : null}
      {replyButton ? (
        <ToolButton
          {...shared}
          index={replyIndex}
          label={t("bubble.reply")}
          onClick={onReply}
        >
          <ReplyIcon aria-hidden="true" className={iconClass} />
        </ToolButton>
      ) : null}
      <DropdownMenu
        open={menuOpen}
        onOpenChange={(open) => {
          setMenuOpen(open);
          onMenuOpenChange(open || pickerOpen);
        }}
      >
        <DropdownMenuTrigger asChild>
          <ToolButton
            {...shared}
            index={menuIndex}
            label={t("bubble.moreActions")}
          >
            <MoreHorizontalIcon aria-hidden="true" className={iconClass} />
          </ToolButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={side === "end" ? "end" : "start"}>
          {available.copy ? (
            <DropdownMenuItem onSelect={onCopy} className="gap-2">
              <CopyIcon aria-hidden="true" className="size-4" />
              {t("bubble.copyText")}
            </DropdownMenuItem>
          ) : null}
          {available.reply ? (
            <DropdownMenuItem onSelect={onReply} className="gap-2">
              <ReplyIcon aria-hidden="true" className="size-4" />
              {t("bubble.reply")}
            </DropdownMenuItem>
          ) : null}
          {available.deliveryDetails ? (
            <DropdownMenuItem onSelect={onDeliveryDetails} className="gap-2">
              <InfoIcon aria-hidden="true" className="size-4" />
              {t("bubble.deliveryDetails")}
            </DropdownMenuItem>
          ) : null}
          {available.retry ? (
            <DropdownMenuItem onSelect={onRetry} className="gap-2">
              <RotateCwIcon aria-hidden="true" className="size-4" />
              {t("bubble.retry")}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
