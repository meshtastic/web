import { IndicatorIcon } from "@components/generic/NodeTrustIndicators.tsx";
import { NodeAvatar } from "@components/UI/NodeAvatar.tsx";
import type { DeliveryLine } from "@core/messaging/deliveryView.ts";
import {
  type IncomingMeta,
  type MessageActionsAvailability,
  signalTone,
} from "@core/messaging/messageListView.ts";
import type { ThreadMessage } from "@core/messaging/thread.ts";
import { nodeAvatarColors } from "@core/utils/nodeIdentity.ts";
import { cn } from "@core/utils/cn.ts";
import {
  CableIcon,
  CloudIcon,
  NetworkIcon,
  ShieldCheckIcon,
  SmileIcon,
} from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DeliveryStatus } from "./DeliveryStatus.tsx";
import { MessageActionsBar } from "./MessageActionsBar.tsx";
import type { EmojiPrefs } from "./useEmoji.ts";
import { ReactionChips } from "./ReactionChips.tsx";
import { ReplyQuote, type ReplyQuoteView } from "./ReplyQuote.tsx";
import { useLongPress } from "./useLongPress.ts";

export interface BubbleSender {
  readonly nodeNum: number;
  readonly name: string;
  readonly initials: string;
}

/** Everything a bubble can ask of the list; one stable object per list. */
export interface BubbleHandlers {
  /** Pin this bubble's actions bar open (`viaKeyboard` focuses it), or close it. */
  setActive: (key: string | undefined, viaKeyboard?: boolean) => void;
  react: (thread: ThreadMessage, emoji: string) => void;
  reply: (thread: ThreadMessage) => void;
  copy: (thread: ThreadMessage) => void;
  deliveryDetails: (thread: ThreadMessage) => void;
  retry: (thread: ThreadMessage) => void;
  retryReaction: (packetId: number) => void;
  jumpTo: (key: string) => void;
}

export interface MessageBubbleProps {
  thread: ThreadMessage;
  /** `messageKey` of the message: React key, DOM id suffix, pin id. */
  entryKey: string;
  /** First of a run from one sender: draw avatar (and name on channels). */
  showSender: boolean;
  /** Channels name each sender; DMs don't. */
  variant: "channel" | "dm";
  /** Who sent an incoming message. */
  sender?: BubbleSender;
  replyQuote?: ReplyQuoteView;
  /** Clock time, formatted. */
  time: string;
  /** Incoming only: hops, signal, transport. */
  meta?: IncomingMeta;
  /** Outgoing only. */
  delivery?: DeliveryLine;
  available: MessageActionsAvailability;
  /** Actions bar pinned open (smiley button, long-press). */
  active: boolean;
  /** Pinned from the keyboard: focus moves into the bar. */
  activeViaKeyboard: boolean;
  /** Briefly outlined after jumping to it from a reply. */
  highlighted: boolean;
  touch: boolean;
  handlers: BubbleHandlers;
  /** Quick reactions and the emoji picker's memory. */
  emoji: EmojiPrefs;
  locale: string;
}

/**
 * The sender's name tinted with their node colour, mixed toward the
 * primary text colour so it stays readable on either theme.
 */
const nameStyle = (nodeNum: number) => ({
  color: `color-mix(in oklab, ${nodeAvatarColors(nodeNum).background} 35%, var(--mt-fg-primary))`,
});

const transportIcons = {
  mqtt: CloudIcon,
  udp: NetworkIcon,
  api: CableIcon,
} as const;

const IncomingMetaLine = ({
  meta,
  locale,
}: {
  meta: IncomingMeta;
  locale: string;
}) => {
  const { t } = useTranslation("messages");
  const parts: { text: string; tone?: string }[] = [
    {
      text:
        meta.hops === undefined
          ? t("thread.hopsUnknown")
          : meta.hops === 0
            ? t("thread.direct")
            : t("thread.hops", { count: meta.hops }),
    },
  ];
  if (meta.snr !== undefined) {
    parts.push({
      text: t("thread.snr", {
        value: new Intl.NumberFormat(locale, {
          maximumFractionDigits: 1,
        }).format(meta.snr),
      }),
      ...(meta.snrQuality ? { tone: signalTone(meta.snrQuality) } : {}),
    });
  }
  if (meta.rssi !== undefined) {
    parts.push({
      text: t("thread.rssi", { value: meta.rssi }),
      ...(meta.rssiQuality ? { tone: signalTone(meta.rssiQuality) } : {}),
    });
  }
  const TransportIcon = meta.transport
    ? transportIcons[meta.transport]
    : undefined;
  return (
    <>
      {parts.map((part) => (
        <span key={part.text} className="whitespace-nowrap">
          <span aria-hidden="true">· </span>
          <span className={part.tone}>{part.text}</span>
        </span>
      ))}
      {meta.signed ? (
        <IndicatorIcon
          icon={ShieldCheckIcon}
          size={14}
          label={t("signature.signed.label")}
          tooltip={t("signature.signed.tooltip")}
          className="text-accent"
        />
      ) : null}
      {TransportIcon && meta.transport ? (
        <IndicatorIcon
          icon={TransportIcon}
          size={14}
          label={t(`diagnostics.transport.${meta.transport}.label`)}
          tooltip={t(`diagnostics.transport.${meta.transport}.tooltip`)}
          className="text-muted"
        />
      ) : null}
    </>
  );
};

/**
 * One message: incoming (avatar, name on channels, raised bubble with the
 * tail bottom-left) or outgoing (green bubble, tail bottom-right, delivery
 * line). Hover, focus, the smiley button or a long-press bring up the
 * actions bar at the bubble's top corner.
 */
export const MessageBubble = memo(function MessageBubble({
  thread,
  entryKey: key,
  showSender,
  variant,
  sender,
  replyQuote,
  time,
  meta,
  delivery,
  available,
  active,
  activeViaKeyboard,
  highlighted,
  touch,
  handlers,
  emoji,
  locale,
}: MessageBubbleProps) {
  const { t } = useTranslation("messages");
  const { message, outgoing } = thread;
  const [menuOpen, setMenuOpen] = useState(false);
  const pickButton = useRef<HTMLButtonElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const longPress = useLongPress(() => handlers.setActive(key));
  const rowProps = {
    ref: container,
    id: `msg-${key}`,
    // Focus target when jumping here from a reply quote.
    tabIndex: -1,
    ...longPress.handlers,
  };
  const pressClass =
    longPress.pressing && "select-none [-webkit-touch-callout:none]";
  const fullDate = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "full",
        timeStyle: "short",
      }).format(message.rxTime),
    [locale, message.rxTime],
  );
  const canAct = available.react || available.reply || available.copy;
  const barVisible = active || menuOpen;

  // A pinned bar closes on a click or tap anywhere else.
  useEffect(() => {
    if (!active || menuOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && container.current?.contains(target)) {
        return;
      }
      handlers.setActive(undefined);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [active, menuOpen, handlers]);

  const dismiss = () => {
    handlers.setActive(undefined);
    pickButton.current?.focus();
  };

  const pickLabel =
    !outgoing && sender
      ? t("bubble.reactOrReplyTo", { name: sender.name })
      : t("bubble.reactOrReply");
  const pick = canAct ? (
    <button
      ref={pickButton}
      type="button"
      aria-label={pickLabel}
      aria-expanded={active}
      onClick={(event) =>
        // detail 0: activated from the keyboard, so focus the bar.
        handlers.setActive(active ? undefined : key, event.detail === 0)
      }
      className="flex size-[26px] shrink-0 cursor-pointer items-center justify-center rounded-md text-muted relative pointer-coarse:touch-target hover:bg-raised hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <SmileIcon aria-hidden="true" className="size-[15px]" />
    </button>
  ) : null;

  // Sits on the bubble's top corner (right for incoming, left for
  // outgoing). On a bubble narrower than the bar, safe alignment lets it
  // run into the open side of the row instead of off the list's edge.
  // On touch it spans the whole row instead (the row is the anchor), so a
  // bar of full-size targets fits a phone's width beside a narrow bubble.
  const bar = canAct ? (
    <div
      className={cn(
        "pointer-events-none absolute z-10 *:pointer-events-auto",
        touch
          ? cn("inset-x-0 -top-8", outgoing ? "justify-end" : "justify-start")
          : cn(
              "-top-6 justify-end-safe",
              outgoing ? "right-0 -left-3 flex-row-reverse" : "-right-3 left-0",
            ),
        barVisible ? "flex" : "hidden group-focus-within:flex group-hover:flex",
      )}
    >
      <MessageActionsBar
        available={available}
        side={outgoing ? "start" : "end"}
        touch={touch}
        focusOnOpen={active && activeViaKeyboard}
        emoji={emoji}
        onReact={(emoji) => {
          handlers.react(thread, emoji);
          handlers.setActive(undefined);
        }}
        onReply={() => {
          handlers.reply(thread);
          handlers.setActive(undefined);
        }}
        onCopy={() => handlers.copy(thread)}
        onDeliveryDetails={() => handlers.deliveryDetails(thread)}
        onRetry={() => handlers.retry(thread)}
        onMenuOpenChange={setMenuOpen}
        onDismiss={dismiss}
      />
    </div>
  ) : null;

  const timeElement = (
    <time dateTime={message.rxTime.toISOString()} className="whitespace-nowrap">
      <span aria-hidden="true">{time}</span>
      <span className="sr-only">{fullDate}</span>
    </time>
  );

  const chips = (
    <ReactionChips
      chips={thread.reactions}
      align={outgoing ? "end" : "start"}
      onToggle={
        available.react ? (emoji) => handlers.react(thread, emoji) : undefined
      }
      onRetry={available.react ? handlers.retryReaction : undefined}
    />
  );

  const quote = replyQuote ? (
    <ReplyQuote quote={replyQuote} onJump={handlers.jumpTo} />
  ) : null;

  const text = (
    <span className="leading-[1.45] break-words whitespace-pre-wrap">
      {message.text}
    </span>
  );

  const maxWidth = touch ? "max-w-[78%]" : "max-w-[60%]";

  if (outgoing) {
    const failed = delivery?.kind === "failed";
    const pending = delivery?.kind === "pending";
    return (
      <div
        {...rowProps}
        className={cn(
          "group flex justify-end outline-none",
          touch && "relative",
          pressClass,
        )}
      >
        <div
          className={cn(
            "flex flex-col items-end gap-1",
            !touch && "relative",
            maxWidth,
          )}
        >
          {bar}
          <div
            className={cn(
              "flex flex-col gap-1 rounded-bubble rounded-br-tail px-3.5 py-2.5",
              failed
                ? "bg-bubble-failed text-on-bubble-failed"
                : pending
                  ? "bg-bubble-pending text-on-bubble-pending"
                  : "bg-bubble-sent text-on-bubble-sent",
              highlighted && "ring-2 ring-accent",
            )}
          >
            <span className="sr-only">{t("bubble.fromYou")}: </span>
            {quote}
            {text}
          </div>
          {chips}
          <div className="flex items-center gap-1.5 text-meta text-muted">
            {pick}
            {timeElement}
            {delivery ? (
              <>
                <span aria-hidden="true">·</span>
                <DeliveryStatus
                  line={delivery}
                  onShowDetails={() => handlers.deliveryDetails(thread)}
                  onRetry={
                    available.retry ? () => handlers.retry(thread) : undefined
                  }
                />
              </>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      {...rowProps}
      className={cn(
        "group flex items-end gap-2.5 outline-none",
        touch && "relative",
        pressClass,
      )}
    >
      {sender && showSender ? (
        <NodeAvatar
          initials={sender.initials}
          tone={{ kind: "node", nodeNum: sender.nodeNum }}
          size="xs"
        />
      ) : (
        // The xs avatar's minimum width, so grouped messages line up.
        <span aria-hidden="true" className="w-14 shrink-0" />
      )}
      <div
        className={cn(
          "flex min-w-0 flex-col gap-1",
          !touch && "relative",
          maxWidth,
        )}
      >
        {bar}
        <div
          className={cn(
            "flex flex-col gap-[3px] rounded-bubble rounded-bl-tail bg-raised px-3.5 pt-2 pb-2.5",
            highlighted && "ring-2 ring-accent",
          )}
        >
          {variant === "channel" && sender && showSender ? (
            <span
              className="text-help font-semibold"
              style={nameStyle(sender.nodeNum)}
            >
              {sender.name}
            </span>
          ) : sender ? (
            <span className="sr-only">{sender.name}: </span>
          ) : null}
          {quote}
          {text}
        </div>
        {chips}
        <div className="flex flex-wrap items-center gap-1.5 text-meta text-muted">
          {timeElement}
          {meta ? <IncomingMetaLine meta={meta} locale={locale} /> : null}
          {pick}
        </div>
      </div>
    </div>
  );
});
