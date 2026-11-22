import { Divider } from "@components/UI/Divider.tsx";
import { Spinner } from "@components/UI/Spinner.tsx";
import {
  announceDelay,
  type IncomingForAnnouncement,
  summarizeIncoming,
} from "@core/messaging/announcer.ts";
import {
  type DeliveryLine,
  deliveryLine,
} from "@core/messaging/deliveryView.ts";
import {
  actionsFor,
  groupTimeline,
  type IncomingMeta,
  incomingMeta,
  type MessageActionsAvailability,
  type MessageEntry,
  messageKey,
  type TimelineEntry,
} from "@core/messaging/messageListView.ts";
import {
  decideOnAppend,
  diffList,
  isAtBottom,
  preservedScrollTop,
  type ScrollMetrics,
  shouldLoadOlder,
} from "@core/messaging/scrollAnchor.ts";
import type { ThreadMessage } from "@core/messaging/thread.ts";
import { cn } from "@core/utils/cn.ts";
import type { LoRaSignalSettings } from "@core/utils/signalQuality.ts";
import { ArrowDownIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { MessageActionsBar } from "./MessageActionsBar.tsx";
import {
  BAR_SLOT_SELECTOR,
  type BubbleHandlers,
  type BubbleSender,
  bubbleIds,
  MessageBubble,
} from "./MessageBubble.tsx";
import type { ReplyQuoteView } from "./ReplyQuote.tsx";
import type { EmojiPrefs } from "./useEmoji.ts";
import { TracerouteCard } from "./TracerouteCard.tsx";

/** Actions on a message; the list adds focus, pinning and jumping itself. */
export type MessageListHandlers = Omit<BubbleHandlers, "setActive" | "jumpTo">;

export interface MessageListProps {
  /** Accessible name, e.g. "Messages in Primary". */
  label: string;
  entries: readonly TimelineEntry[];
  variant: "channel" | "dm";
  connected: boolean;
  sender: (nodeNum: number) => BubbleSender;
  /** Name for a reply quote's author ("You" for mine). */
  quoteName: (nodeNum: number) => string;
  nameOf: (nodeNum: number) => string;
  formatTime: (date: Date) => string;
  dayLabel: (day: Date) => string;
  /** Loads the page before the oldest message; resolves to how many came. */
  loadOlder: () => Promise<number>;
  handlers: MessageListHandlers;
  /** Quick reactions and the emoji picker's memory. */
  emoji: EmojiPrefs;
  touch: boolean;
  locale: string;
  /** LoRa settings, to rate SNR against the decode floor. */
  lora?: LoRaSignalSettings;
  /** Announce arriving messages to screen readers (off for muted channels). */
  announce?: boolean;
}

const HIGHLIGHT_MS = 1600;

interface BubbleProps {
  readonly sender?: BubbleSender;
  readonly replyQuote?: ReplyQuoteView;
  readonly time: string;
  readonly meta?: IncomingMeta;
  readonly delivery?: DeliveryLine;
  readonly available: MessageActionsAvailability;
}

interface CachedBubbleProps {
  readonly signature: string;
  readonly sender: (nodeNum: number) => BubbleSender;
  readonly quoteName: (nodeNum: number) => string;
  readonly formatTime: (date: Date) => string;
  readonly lora: LoRaSignalSettings | undefined;
  readonly value: BubbleProps;
}

const metricsOf = (el: HTMLElement): ScrollMetrics => ({
  scrollTop: el.scrollTop,
  scrollHeight: el.scrollHeight,
  clientHeight: el.clientHeight,
});

/**
 * The conversation's scrolling history: date separators, bubbles and
 * traceroute cards. Stays pinned to the newest message while the reader is
 * at the bottom (also when bubbles or the composer change height),
 * otherwise offers a "new messages" button; loads older history when
 * scrolled to the top without moving what's on screen. Mount one per
 * conversation (key it), so its scroll state starts fresh.
 */
export const MessageList = ({
  label,
  entries,
  variant,
  connected,
  sender,
  quoteName,
  nameOf,
  formatTime,
  dayLabel,
  loadOlder,
  handlers,
  emoji,
  touch,
  locale,
  lora,
  announce = true,
}: MessageListProps) => {
  const { t } = useTranslation("messages");
  const scroller = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const metrics = useRef<ScrollMetrics | undefined>(undefined);
  const atBottom = useRef(true);
  const previousKeys = useRef<readonly string[]>([]);
  const loading = useRef(false);
  // A failed load stops the automatic retries until the list changes; the
  // reader can still ask again by scrolling to the top.
  const autoPaused = useRef(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const pendingAnnounce = useRef<IncomingForAnnouncement[]>([]);
  const lastAnnouncedAt = useRef<number | undefined>(undefined);
  const announceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  // The one actions bar: which message it acts on (portalled into that
  // bubble's slot), whether it is pinned open and whether one of its menus
  // is open. CSS shows it on hover or keyboard focus, and places it.
  const [target, setTarget] = useState<
    { key: string; slot: HTMLElement } | undefined
  >(undefined);
  const [active, setActive] = useState<
    { key: string; viaKeyboard: boolean } | undefined
  >(undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const lock = useRef<{ active: string | undefined; menuOpen: boolean }>({
    active: undefined,
    menuOpen: false,
  });
  // Escape puts focus back on the smiley button; that focus mustn't bring
  // the bar straight back.
  const skipFocus = useRef(false);
  const [highlighted, setHighlighted] = useState<string | undefined>(undefined);

  const [propsCache] = useState(
    () => new WeakMap<ThreadMessage, CachedBubbleProps>(),
  );
  const groups = useMemo(() => groupTimeline(entries), [entries]);
  const keys = useMemo(() => entries.map((e) => e.key), [entries]);
  const messageKeys = useMemo(
    () =>
      new Set(entries.flatMap((e) => (e.kind === "message" ? [e.key] : []))),
    [entries],
  );
  const messageKeysRef = useRef(messageKeys);
  const idToKey = useMemo(() => {
    const map = new Map<number, string>();
    for (const e of entries) {
      if (e.kind === "message") {
        map.set(e.thread.message.id, e.key);
      }
    }
    return map;
  }, [entries]);
  const hasEntries = entries.length > 0;

  const requestOlder = useCallback(() => {
    if (loading.current) {
      return;
    }
    loading.current = true;
    setLoadingOlder(true);
    loadOlder()
      .then((count) => {
        // Nothing older while history is shown: this is the start of it.
        // (With nothing shown yet there is no cursor to page from.)
        if (count === 0 && messageKeysRef.current.size > 0) {
          setExhausted(true);
        }
      })
      .catch(() => {
        autoPaused.current = true;
      })
      .finally(() => {
        loading.current = false;
        setLoadingOlder(false);
      });
  }, [loadOlder]);

  const flushAnnouncements = useCallback(() => {
    announceTimer.current = undefined;
    const summary = summarizeIncoming(pendingAnnounce.current);
    pendingAnnounce.current = [];
    if (!summary) {
      return;
    }
    lastAnnouncedAt.current = Date.now();
    setAnnouncement(
      summary.kind === "one"
        ? t("thread.announceIncoming", {
            name: sender(summary.from).name,
            text: summary.text,
          })
        : t("thread.announceMany", { count: summary.count }),
    );
  }, [sender, t]);

  useEffect(
    () => () => {
      if (announceTimer.current !== undefined) {
        clearTimeout(announceTimer.current);
      }
    },
    [],
  );

  useLayoutEffect(() => {
    messageKeysRef.current = messageKeys;
  }, [messageKeys]);

  // If the bar's message goes away (cleared, filtered), a menu it had
  // open went with it (unmounted, without a close event): stop holding.
  const menuHeld =
    menuOpen && target !== undefined && messageKeys.has(target.key);

  useLayoutEffect(() => {
    lock.current = { active: active?.key, menuOpen: menuHeld };
  }, [active, menuHeld]);

  // A pinned bar closes on a click or tap anywhere outside its message
  // (the bar is inside it), unless one of its menus is open.
  useEffect(() => {
    if (!active || menuHeld) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const row = document.getElementById(bubbleIds(active.key).row);
      if (event.target instanceof Node && row?.contains(event.target)) {
        return;
      }
      setActive(undefined);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [active, menuHeld]);

  /**
   * Points the bar at the message under the pointer or keyboard focus.
   * It stays put while a menu of it is open, and while pinned it only
   * follows keyboard focus (which unpins it).
   */
  const retarget = useCallback(
    (from: EventTarget, via: "pointer" | "focus") => {
      const row =
        from instanceof Element ? from.closest("[data-entry-key]") : null;
      const key = row?.getAttribute("data-entry-key");
      if (via === "focus" && skipFocus.current) {
        skipFocus.current = false;
        return;
      }
      if (!row || !key || lock.current.menuOpen) {
        return;
      }
      if (lock.current.active !== undefined && lock.current.active !== key) {
        if (via === "pointer") {
          return;
        }
        setActive(undefined);
      }
      const slot = row.querySelector(BAR_SLOT_SELECTOR);
      if (!(slot instanceof HTMLElement)) {
        return;
      }
      setTarget((current) =>
        current?.key === key && current.slot === slot ? current : { key, slot },
      );
    },
    [],
  );

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) {
      return;
    }
    const change = diffList(previousKeys.current, keys);
    const before = metrics.current;
    previousKeys.current = keys;
    autoPaused.current = false;
    if (change.reset) {
      el.scrollTop = el.scrollHeight;
      setUnseen(0);
    } else {
      if (change.prepended > 0 && before) {
        el.scrollTop = preservedScrollTop(
          before.scrollTop,
          before.scrollHeight,
          el.scrollHeight,
        );
      }
      if (change.appended > 0) {
        const appended = entries.slice(entries.length - change.appended);
        const last = appended.at(-1);
        const lastIsMine = last?.kind === "message" && last.thread.outgoing;
        const decision = decideOnAppend({
          wasAtBottom: atBottom.current,
          appended: change.appended,
          lastIsMine,
          pending: 0,
        });
        if (decision.kind === "stick") {
          el.scrollTop = el.scrollHeight;
        } else if (decision.kind === "notify") {
          setUnseen((n) => n + change.appended);
        }
        if (announce) {
          for (const e of appended) {
            if (e.kind === "message" && !e.thread.outgoing) {
              pendingAnnounce.current.push({
                from: e.thread.message.from,
                text: e.thread.message.text,
              });
            }
          }
          if (
            pendingAnnounce.current.length > 0 &&
            announceTimer.current === undefined
          ) {
            announceTimer.current = setTimeout(
              flushAnnouncements,
              announceDelay(lastAnnouncedAt.current, Date.now()),
            );
          }
        }
      }
    }
    metrics.current = metricsOf(el);
    atBottom.current = isAtBottom(metrics.current);
  }, [keys, entries, announce, flushAnnouncements]);

  // Bubbles grow (reactions, delivery line) and the list shrinks (reply
  // strip, a growing composer) without new messages: stay at the bottom.
  useEffect(() => {
    const el = scroller.current;
    const inner = content.current;
    if (!el || !inner || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => {
      if (atBottom.current) {
        el.scrollTop = el.scrollHeight;
      }
      metrics.current = metricsOf(el);
    });
    observer.observe(el);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  // A short history doesn't scroll, so nothing would ever ask for more.
  // Wait for the first page (hydration is async): with nothing shown there
  // is nothing to page back from.
  useEffect(() => {
    const el = scroller.current;
    if (
      el &&
      hasEntries &&
      !exhausted &&
      !loadingOlder &&
      !autoPaused.current &&
      el.scrollHeight <= el.clientHeight
    ) {
      requestOlder();
    }
  }, [keys, hasEntries, exhausted, loadingOlder, requestOlder]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) {
      return;
    }
    metrics.current = metricsOf(el);
    atBottom.current = isAtBottom(metrics.current);
    if (atBottom.current && unseen > 0) {
      setUnseen(0);
    }
    if (
      hasEntries &&
      shouldLoadOlder({
        scrollTop: el.scrollTop,
        loading: loading.current,
        exhausted,
      })
    ) {
      requestOlder();
    }
  };

  const scrollToEnd = () => {
    const el = scroller.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
    setUnseen(0);
  };

  useEffect(() => {
    if (!highlighted) {
      return;
    }
    const timer = setTimeout(() => setHighlighted(undefined), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlighted]);

  // Stable across new messages, so memoised bubbles don't re-render.
  const bubbleHandlers = useMemo<BubbleHandlers>(
    () => ({
      ...handlers,
      setActive: (key, viaKeyboard = false) => {
        if (key === undefined) {
          setActive(undefined);
          return;
        }
        const row = document.getElementById(bubbleIds(key).row);
        const slot = row?.querySelector(BAR_SLOT_SELECTOR);
        if (slot instanceof HTMLElement) {
          setTarget({ key, slot });
        }
        setActive({ key, viaKeyboard });
      },
      jumpTo: (key) => {
        if (!messageKeysRef.current.has(key)) {
          return;
        }
        const target = document.getElementById(`msg-${key}`);
        target?.scrollIntoView({ block: "center", behavior: "smooth" });
        target?.focus({ preventScroll: true });
        setHighlighted(key);
      },
    }),
    [handlers],
  );

  // Per-bubble props, rebuilt only when their inputs change, so memoised
  // bubbles skip re-rendering while the reader scrolls or hovers.
  const bubbleProps = useMemo(() => {
    const targetOf = (reply: { id: number; from: number }) =>
      idToKey.get(reply.id) ?? messageKey({ id: reply.id, from: reply.from });
    const quoteFor = (entry: MessageEntry): ReplyQuoteView | undefined => {
      const reply = entry.thread.replyTo;
      if (!reply) {
        return undefined;
      }
      if (reply.kind === "unavailable") {
        return { kind: "unavailable" };
      }
      const targetKey = targetOf(reply);
      return {
        kind: "resolved",
        name: quoteName(reply.from),
        excerpt: reply.excerpt,
        ...(messageKeys.has(targetKey) ? { targetKey } : {}),
      };
    };
    const out = new Map<string, BubbleProps>();
    for (const entry of entries) {
      if (entry.kind !== "message") {
        continue;
      }
      const { thread } = entry;
      const reply = thread.replyTo;
      const signature = `${connected}|${variant}|${
        reply?.kind === "resolved" ? messageKeys.has(targetOf(reply)) : ""
      }`;
      const hit = propsCache.get(thread);
      if (
        hit &&
        hit.signature === signature &&
        hit.sender === sender &&
        hit.quoteName === quoteName &&
        hit.formatTime === formatTime &&
        hit.lora === lora
      ) {
        out.set(entry.key, hit.value);
        continue;
      }
      const delivery = thread.delivery
        ? deliveryLine(thread.delivery, thread.message)
        : undefined;
      const value: BubbleProps = {
        ...(thread.outgoing ? {} : { sender: sender(thread.message.from) }),
        replyQuote: quoteFor(entry),
        time: formatTime(thread.message.rxTime),
        ...(thread.outgoing
          ? {}
          : {
              // Under the bubble: SNR when heard directly, else hops.
              meta: incomingMeta(thread.message, {
                includeSignal: true,
                ...(lora ? { lora } : {}),
              }),
            }),
        ...(delivery ? { delivery } : {}),
        available: actionsFor(thread, connected, delivery),
      };
      propsCache.set(thread, {
        signature,
        sender,
        quoteName,
        formatTime,
        lora,
        value,
      });
      out.set(entry.key, value);
    }
    return out;
  }, [
    propsCache,
    entries,
    idToKey,
    messageKeys,
    quoteName,
    sender,
    formatTime,
    variant,
    connected,
    lora,
  ]);

  const threadOf = useMemo(() => {
    const map = new Map<string, ThreadMessage>();
    for (const e of entries) {
      if (e.kind === "message") {
        map.set(e.key, e.thread);
      }
    }
    return map;
  }, [entries]);

  const bar = (() => {
    if (!target) {
      return null;
    }
    const { key, slot } = target;
    const barThread = threadOf.get(key);
    const props = bubbleProps.get(key);
    if (!barThread || !props) {
      return null;
    }
    const { available } = props;
    if (!available.react && !available.reply && !available.copy) {
      return null;
    }
    const pinned = active?.key === key;
    const close = () => setActive(undefined);
    return createPortal(
      <div
        id={bubbleIds(key).actions}
        className="message-actions"
        data-side={barThread.outgoing ? "start" : "end"}
        data-pinned={pinned || menuHeld ? "" : undefined}
      >
        <MessageActionsBar
          // A fresh bar per message: its roving focus starts over, and
          // focusOnOpen fires again when pinned from the keyboard.
          key={key}
          available={available}
          side={barThread.outgoing ? "start" : "end"}
          touch={touch}
          focusOnOpen={pinned && active.viaKeyboard}
          emoji={emoji}
          onReact={(choice) => {
            handlers.react(barThread, choice);
            close();
          }}
          onReply={() => {
            handlers.reply(barThread);
            close();
          }}
          onCopy={() => handlers.copy(barThread)}
          onDeliveryDetails={() => handlers.deliveryDetails(barThread)}
          onRetry={() => handlers.retry(barThread)}
          onMenuOpenChange={setMenuOpen}
          onDismiss={() => {
            close();
            setTarget(undefined);
            setMenuOpen(false);
            const pick = document.getElementById(bubbleIds(key).pick);
            if (pick) {
              skipFocus.current = true;
              pick.focus();
              skipFocus.current = false;
            }
          }}
        />
      </div>,
      slot,
    );
  })();

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <section
        ref={scroller}
        aria-label={label}
        aria-busy={loadingOlder}
        onScroll={onScroll}
        data-touch={touch ? "" : undefined}
        className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto"
      >
        <div
          ref={content}
          // One listener for every message: points the actions bar at the
          // one under the pointer (touch uses long-press) or focus.
          onPointerOver={(event) => {
            if (event.pointerType !== "touch") {
              retarget(event.target, "pointer");
            }
          }}
          onFocus={(event) => retarget(event.target, "focus")}
          className={cn(
            "flex flex-1 flex-col",
            touch ? "gap-3 px-3 py-4" : "gap-3.5 px-6 py-5",
          )}
        >
          {entries.length === 0 && !loadingOlder ? (
            <p className="m-auto text-help text-muted">{t("thread.empty")}</p>
          ) : null}
          {groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-[inherit]">
              {touch ? (
                <h3 className="m-0 self-center rounded-control bg-raised px-2.5 py-1 text-meta font-normal text-muted">
                  {dayLabel(group.day)}
                </h3>
              ) : (
                <Divider
                  label={
                    <h3 className="m-0 text-meta font-medium">
                      {dayLabel(group.day)}
                    </h3>
                  }
                />
              )}
              <ol className="m-0 flex list-none flex-col gap-[inherit] p-0">
                {group.items.map((entry) => {
                  if (entry.kind === "traceroute") {
                    return (
                      <li key={entry.key}>
                        <TracerouteCard
                          trace={entry.trace}
                          time={formatTime(entry.at)}
                          nameOf={nameOf}
                          locale={locale}
                        />
                      </li>
                    );
                  }
                  const props = bubbleProps.get(entry.key);
                  if (!props) {
                    return null;
                  }
                  return (
                    <li
                      key={entry.key}
                      // The bar's message: its bubble is the CSS anchor.
                      data-bar-target={
                        target?.key === entry.key ? "" : undefined
                      }
                      data-entry-key={entry.key}
                    >
                      <MessageBubble
                        thread={entry.thread}
                        entryKey={entry.key}
                        startsRun={entry.startsRun}
                        {...props}
                        active={active?.key === entry.key}
                        highlighted={highlighted === entry.key}
                        touch={touch}
                        handlers={bubbleHandlers}
                        locale={locale}
                      />
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
        {bar}
      </section>
      {loadingOlder ? (
        <div className="pointer-events-none absolute top-2 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-elevated bg-surface px-3 py-1 text-meta text-muted shadow-popover">
          <Spinner size="sm" />
          {t("thread.loadingOlder")}
        </div>
      ) : null}
      {unseen > 0 ? (
        <button
          type="button"
          onClick={scrollToEnd}
          className="absolute bottom-3 left-1/2 flex -translate-x-1/2 cursor-pointer items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-help font-semibold text-on-accent shadow-popover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <ArrowDownIcon aria-hidden="true" className="size-4" />
          {t("thread.newMessages", { count: unseen })}
        </button>
      ) : null}
      <output aria-live="polite" className="sr-only">
        {announcement}
      </output>
    </div>
  );
};
