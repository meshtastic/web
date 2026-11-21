import { ConfirmDialog } from "@components/UI/ConfirmDialog.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { useDraft, useMessagingActions, useThread } from "@core/kmp/hooks";
import { buildTimeline, messageKey } from "@core/messaging/messageListView.ts";
import { excerpt, type ThreadMessage } from "@core/messaging/thread.ts";
import type { TracerouteView } from "@core/messaging/tracerouteView.ts";
import type { Types } from "@core/protobuf.ts";
import type { ConversationKey, Message } from "@core/storage/types.ts";
import type { LoRaSignalSettings } from "@core/utils/signalQuality.ts";
import { formatClockTime, formatDayLabel } from "@core/utils/timeFormat.ts";
import { Result } from "better-result";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Composer } from "./Composer.tsx";
import { DeliveryDetailsDialog } from "./DeliveryDetailsDialog.tsx";
import type { BubbleSender } from "./MessageBubble.tsx";
import { MessageList, type MessageListHandlers } from "./MessageList.tsx";

export interface ConversationThreadProps {
  conversation: ConversationKey;
  title: string;
  /** Composer help line (keys, hop limit, encryption). */
  hint: string;
  destination: Types.Destination;
  channel: Types.ChannelNumber;
  connected: boolean;
  traceroutes: readonly TracerouteView[];
  sender: (nodeNum: number) => BubbleSender;
  nameOf: (nodeNum: number) => string;
  myNodeNum?: number;
  lora?: LoRaSignalSettings;
  /** Muted channel: no screen reader announcements for arriving text. */
  muted: boolean;
  touch: boolean;
  /** The header asked to clear this conversation; confirm here. */
  confirmClear: boolean;
  onConfirmClearChange: (open: boolean) => void;
  onClear: () => void;
}

interface ReplyTarget {
  readonly id: number;
  readonly name: string;
  readonly excerpt: string;
}

/**
 * The open conversation's history and composer, with the reply, delivery
 * details and clear-confirmation state that belong to it. Key it by
 * conversation so that state starts fresh on switching, while the shell
 * page around it (header, sidebar, details) stays mounted.
 */
export const ConversationThread = ({
  conversation,
  title,
  hint,
  destination,
  channel,
  connected,
  traceroutes,
  sender,
  nameOf,
  myNodeNum,
  lora,
  muted,
  touch,
  confirmClear,
  onConfirmClearChange,
  onClear,
}: ConversationThreadProps) => {
  const { t, i18n } = useTranslation("messages");
  const locale = i18n.language;
  const { toast } = useToast();
  const actions = useMessagingActions();
  const { messages, loadOlder } = useThread(conversation);
  const draft = useDraft(conversation);
  const [reply, setReply] = useState<ReplyTarget | undefined>(undefined);
  const [detailsKey, setDetailsKey] = useState<string | undefined>(undefined);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  // The current draft, for deciding what a failed send restores.
  const draftText = useRef(draft.text);
  useEffect(() => {
    draftText.current = draft.text;
  }, [draft.text]);

  const isDm = conversation.kind === "direct";
  const entries = useMemo(
    () => buildTimeline(messages, traceroutes),
    [messages, traceroutes],
  );
  // The dialog follows the live message, so its status updates in place.
  const detailsMessage = useMemo(
    () =>
      detailsKey === undefined
        ? undefined
        : messages.find((m) => messageKey(m.message) === detailsKey)?.message,
    [messages, detailsKey],
  );

  const failToast = useCallback((title: string) => toast({ title }), [toast]);
  const retry = useCallback(
    (id: number) => {
      void actions.retry(id).then((result) => {
        if (Result.isError(result)) {
          failToast(t("thread.retryFailed"));
        }
      });
    },
    [actions, failToast, t],
  );

  const handlers = useMemo<MessageListHandlers>(
    () => ({
      react: (thread: ThreadMessage, emoji: string) => {
        void actions
          .toggleReaction({
            targetId: thread.message.id,
            emoji,
            destination,
            channel,
          })
          .then((result) => {
            if (Result.isError(result)) {
              failToast(t("thread.reactionFailed"));
            }
          });
      },
      reply: (thread: ThreadMessage) => {
        setReply({
          id: thread.message.id,
          name: thread.outgoing
            ? t("reply.yourself")
            : nameOf(thread.message.from),
          excerpt: excerpt(thread.message.text),
        });
        composerRef.current?.focus();
      },
      copy: (thread: ThreadMessage) => {
        const clipboard =
          typeof navigator === "undefined" ? undefined : navigator.clipboard;
        if (!clipboard) {
          failToast(t("thread.copyFailed"));
          return;
        }
        clipboard
          .writeText(thread.message.text)
          .then(() => toast({ title: t("thread.copied") }))
          .catch(() => failToast(t("thread.copyFailed")));
      },
      deliveryDetails: (thread: ThreadMessage) =>
        setDetailsKey(messageKey(thread.message)),
      retry: (thread: ThreadMessage) => retry(thread.message.id),
      retryReaction: retry,
    }),
    [actions, destination, channel, nameOf, failToast, toast, retry, t],
  );

  const send = (text: string) => {
    const sentReply = reply;
    draft.clear();
    draftText.current = "";
    setReply(undefined);
    void actions
      .sendText({
        text,
        destination,
        channel,
        ...(sentReply === undefined ? {} : { replyId: sentReply.id }),
      })
      .then((result) => {
        if (Result.isError(result)) {
          // Not stored, so give it back rather than lose it, unless the
          // reader has already started typing something else.
          if (draftText.current === "") {
            draft.setText(text);
            if (sentReply) {
              setReply((current) => current ?? sentReply);
            }
          }
          failToast(t("thread.sendFailed"));
        }
      });
  };

  const quoteName = useCallback(
    (nodeNum: number) =>
      nodeNum === myNodeNum ? t("thread.you") : nameOf(nodeNum),
    [myNodeNum, nameOf, t],
  );
  const formatTime = useCallback(
    (date: Date) => formatClockTime(date, locale),
    [locale],
  );
  const dayLabel = useCallback(
    (day: Date) => formatDayLabel(day, Date.now(), locale),
    [locale],
  );
  const loadPage = useCallback(
    () => loadOlder().then((older) => older.length),
    [loadOlder],
  );

  return (
    <>
      <MessageList
        label={t("thread.label", { name: title })}
        entries={entries}
        variant={isDm ? "dm" : "channel"}
        connected={connected}
        sender={sender}
        quoteName={quoteName}
        nameOf={nameOf}
        formatTime={formatTime}
        dayLabel={dayLabel}
        loadOlder={loadPage}
        handlers={handlers}
        touch={touch}
        locale={locale}
        {...(lora ? { lora } : {})}
        announce={!muted}
      />
      <Composer
        ref={composerRef}
        label={t("composer.label", { name: title })}
        placeholder={
          !connected
            ? t("composer.notConnected")
            : touch
              ? t("composer.placeholderMobile")
              : isDm
                ? t("composer.placeholderDm", { name: title })
                : t("composer.placeholderChannel", { name: title })
        }
        hint={hint}
        value={draft.text}
        onChange={draft.setText}
        onSend={send}
        disabled={!connected}
        {...(reply ? { replying: reply } : {})}
        onCancelReply={() => {
          setReply(undefined);
          composerRef.current?.focus();
        }}
        touch={touch}
      />
      <DeliveryDetailsDialog
        message={detailsMessage}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsKey(undefined);
          }
        }}
        {...(connected
          ? { onResend: (message: Message) => retry(message.id) }
          : {})}
      />
      <ConfirmDialog
        open={confirmClear}
        onOpenChange={onConfirmClearChange}
        title={t("header.clearConfirmTitle")}
        description={t("header.clearConfirmDescription", { name: title })}
        confirmLabel={t("header.clearConfirm")}
        tone="danger"
        onConfirm={() => {
          onConfirmClearChange(false);
          setReply(undefined);
          onClear();
        }}
      />
    </>
  );
};
