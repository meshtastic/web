import { IndicatorIcon } from "@components/generic/NodeTrustIndicators.tsx";
import { NodeAvatar } from "@components/UI/NodeAvatar.tsx";
import type { DeliveryLine } from "@core/messaging/deliveryView.ts";
import type { MentionName } from "@core/messaging/mentions.ts";
import {
  type IncomingMeta,
  type MessageActionsAvailability,
  showsSignal,
  signalTone,
} from "@core/messaging/messageListView.ts";
import type { ThreadMessage } from "@core/messaging/thread.ts";
import { cn } from "@core/utils/cn.ts";
import {
  CableIcon,
  CloudIcon,
  NetworkIcon,
  ShieldCheckIcon,
  SmileIcon,
} from "lucide-react";
import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DeliveryStatus } from "./DeliveryStatus.tsx";
import { MessageText } from "./MessageText.tsx";
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
  /** Pin the actions bar on this message (`viaKeyboard` focuses it), or close it. */
  setActive: (key: string | undefined, viaKeyboard?: boolean) => void;
  react: (thread: ThreadMessage, emoji: string) => void;
  reply: (thread: ThreadMessage) => void;
  copy: (thread: ThreadMessage) => void;
  deliveryDetails: (thread: ThreadMessage) => void;
  retry: (thread: ThreadMessage) => void;
  retryReaction: (packetId: number) => void;
  jumpTo: (key: string) => void;
  /** Opens a node's details (an @mention was clicked). */
  openNode?: (nodeNum: number) => void;
}

/** DOM ids the list uses to reach into a bubble. */
export const bubbleIds = (key: string) => ({
  row: `msg-${key}`,
  /** The smiley button; Escape in the actions bar returns focus here. */
  pick: `msg-${key}-pick`,
  /** The list's one actions bar, while it acts on this message. */
  actions: `msg-${key}-actions`,
});

/**
 * Marks the empty element the list portals its one actions bar into, so
 * the bar follows the bubble in tab order and, without CSS anchor
 * positioning, can sit on the bubble's corner.
 */
export const BAR_SLOT_SELECTOR = "[data-bar-slot]";

export interface MessageBubbleProps {
  thread: ThreadMessage;
  /** `messageKey` of the message: React key, DOM id suffix, pin id. */
  entryKey: string;
  /**
   * First of a run: draw the header above the bubble (avatar, name and
   * time when incoming, the time when mine).
   */
  startsRun: boolean;
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
  /** The list's actions bar is pinned open on this message. */
  active: boolean;
  /** Briefly outlined after jumping to it from a reply. */
  highlighted: boolean;
  touch: boolean;
  handlers: BubbleHandlers;
  locale: string;
  /** Current names for @mentions in the text (raw tokens without). */
  mentionName?: MentionName;
  /** My node, for emphasising mentions of me. */
  myNodeNum?: number;
  /** Incoming and @mentions me: drawn to stand out. */
  mentionsMe?: boolean;
}

const NO_NAMES: MentionName = () => undefined;

const transportIcons = {
  mqtt: CloudIcon,
  udp: NetworkIcon,
  api: CableIcon,
} as const;

const IncomingMetaLine = ({
  meta,
  locale,
  leadingSeparator,
}: {
  meta: IncomingMeta;
  locale: string;
  /** Something precedes the line in the same row. */
  leadingSeparator: boolean;
}) => {
  const { t } = useTranslation("messages");
  // One reading, as on Android: the signal when heard directly, else hops.
  const parts: { text: string; tone?: string }[] = showsSignal(meta)
    ? []
    : [
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
      {parts.map((part, i) => (
        <span key={part.text} className="whitespace-nowrap">
          {i > 0 || leadingSeparator ? (
            <span aria-hidden="true">· </span>
          ) : null}
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
 * One message, laid out like the Android app. The first of a run gets a
 * header above the bubble: the sender's avatar chip, long name and time
 * when incoming, just the time when mine. Under the bubble: the signal
 * (heard directly) or hop count, or my delivery status, and the smiley. The list's one actions
 * bar lands in this bubble's slot while it acts on it (hover, focus, the
 * smiley button or a long-press).
 */
export const MessageBubble = memo(function MessageBubble({
  thread,
  entryKey: key,
  startsRun,
  sender,
  replyQuote,
  time,
  meta,
  delivery,
  available,
  active,
  highlighted,
  touch,
  handlers,
  locale,
  mentionName = NO_NAMES,
  myNodeNum,
  mentionsMe = false,
}: MessageBubbleProps) {
  const { t } = useTranslation("messages");
  const { message, outgoing } = thread;
  const ids = bubbleIds(key);
  const longPress = useLongPress(() => handlers.setActive(key));
  const rowProps = {
    id: ids.row,
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

  const pickLabel =
    !outgoing && sender
      ? t("bubble.reactOrReplyTo", { name: sender.name })
      : t("bubble.reactOrReply");
  const pick = canAct ? (
    <button
      id={ids.pick}
      type="button"
      aria-label={pickLabel}
      aria-expanded={active}
      aria-controls={active ? ids.actions : undefined}
      onClick={(event) =>
        // detail 0: activated from the keyboard, so focus the bar.
        handlers.setActive(active ? undefined : key, event.detail === 0)
      }
      className="relative flex size-[26px] shrink-0 cursor-pointer items-center justify-center rounded-md text-muted pointer-coarse:touch-target hover:bg-raised hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <SmileIcon aria-hidden="true" className="size-[15px]" />
    </button>
  ) : null;

  // The visible time lives in the run's header; every bubble keeps the
  // full date for screen readers.
  const srTime = (
    <time dateTime={message.rxTime.toISOString()} className="sr-only">
      {fullDate}
    </time>
  );
  const headerTime = (
    <time
      dateTime={message.rxTime.toISOString()}
      title={fullDate}
      className="shrink-0 whitespace-nowrap text-meta text-muted"
    >
      {time}
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
    <MessageText
      text={message.text}
      mentionName={mentionName}
      {...(handlers.openNode ? { onOpenNode: handlers.openNode } : {})}
      {...(myNodeNum === undefined ? {} : { myNodeNum })}
      outgoing={outgoing}
    />
  );

  // `contents`: takes no room in the column; the bar positions itself.
  const slot = <div data-bar-slot="" className="contents" />;

  const columnClass = cn(
    "flex min-w-0 flex-col gap-1",
    touch ? "max-w-[78%]" : "max-w-[60%]",
  );

  if (outgoing) {
    const failed = delivery?.kind === "failed";
    const pending = delivery?.kind === "pending";
    return (
      <div
        {...rowProps}
        className={cn("flex flex-col items-end outline-none", pressClass)}
      >
        {startsRun ? (
          <div aria-hidden="true" className="flex pb-0.5">
            {headerTime}
          </div>
        ) : null}
        <div data-bubble-column="" className={cn(columnClass, "items-end")}>
          <div
            data-message-bubble=""
            className={cn(
              "flex max-w-full flex-col gap-1 rounded-bubble rounded-br-tail px-3.5 py-2.5",
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
            {srTime}
          </div>
          {chips}
          <div className="flex flex-wrap items-center justify-end gap-x-1.5 gap-y-1 text-meta text-muted">
            {pick}
            {delivery ? (
              <DeliveryStatus
                line={delivery}
                onShowDetails={() => handlers.deliveryDetails(thread)}
                onRetry={
                  available.retry ? () => handlers.retry(thread) : undefined
                }
              />
            ) : null}
          </div>
          {slot}
        </div>
      </div>
    );
  }

  return (
    <div
      {...rowProps}
      className={cn("flex flex-col items-start outline-none", pressClass)}
    >
      {startsRun && sender ? (
        // Decorative: the bubble names its sender and time for screen
        // readers, every bubble of the run alike.
        <div
          aria-hidden="true"
          className="flex max-w-full min-w-0 items-center gap-1.5 pb-1"
        >
          <NodeAvatar
            initials={sender.initials}
            tone={{ kind: "node", nodeNum: sender.nodeNum }}
            size="sm"
          />
          <span className="min-w-0 truncate text-meta font-medium text-muted">
            {sender.name}
          </span>
          {headerTime}
        </div>
      ) : null}
      <div data-bubble-column="" className={columnClass}>
        <div
          data-message-bubble=""
          className={cn(
            "flex max-w-full flex-col gap-[3px] self-start rounded-bubble rounded-bl-tail px-3.5 py-2.5",
            mentionsMe
              ? "border border-accent-tint bg-accent-tint text-on-accent-tint"
              : "bg-raised",
            // Shown only because the user revealed filtered messages.
            thread.filtered && "border border-dashed border-control",
            highlighted && "ring-2 ring-accent",
          )}
        >
          {sender ? <span className="sr-only">{sender.name}: </span> : null}
          {mentionsMe ? (
            <span className="sr-only">{t("mentions.mentionsYou")}. </span>
          ) : null}
          {quote}
          {text}
          {srTime}
        </div>
        {chips}
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-meta text-muted">
          {thread.filtered ? (
            <span className="font-semibold text-secondary">
              {t("filter.filteredLabel")}
            </span>
          ) : null}
          {meta ? (
            <IncomingMetaLine
              meta={meta}
              locale={locale}
              leadingSeparator={thread.filtered === true}
            />
          ) : null}
          {pick}
        </div>
        {slot}
      </div>
    </div>
  );
});
