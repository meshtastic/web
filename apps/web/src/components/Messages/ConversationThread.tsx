import { ConfirmDialog } from "@components/UI/ConfirmDialog.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { useDraft, useMessagingActions, useThread } from "@core/kmp/hooks";
import {
  type MentionName,
  mentionsToText,
  NO_MENTION_NAMES,
} from "@core/messaging/mentions.ts";
import { buildTimeline, messageKey } from "@core/messaging/messageListView.ts";
import { shownRelayNode } from "@core/messaging/relayNode.ts";
import { excerpt, type ThreadMessage } from "@core/messaging/thread.ts";
import type { TracerouteView } from "@core/messaging/tracerouteView.ts";
import type { Types } from "@core/protobuf.ts";
import type { ConversationKey, Message } from "@core/storage/types.ts";
import type { LoRaSignalSettings } from "@core/utils/signalQuality.ts";
import { formatClockTime, formatDayLabel } from "@core/utils/timeFormat.ts";
import { Result } from "better-result";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Composer, type ComposerMentions } from "./Composer.tsx";
import { DeliveryDetailsDialog } from "./DeliveryDetailsDialog.tsx";
import type { MentionSuggestion } from "./MentionSuggestions.tsx";
import type { BubbleSender } from "./MessageBubble.tsx";
import { MessageList, type MessageListHandlers } from "./MessageList.tsx";
import { useEmojiPrefs } from "./useEmoji.ts";

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
  /** Current names for @mentions (undefined: show the raw token). */
  mentionName?: MentionName;
  /** Nodes the composer's `@` offers. */
  mentionCandidates?: readonly MentionSuggestion[];
  /** Opens a node's details, from an @mention. */
  onOpenNode?: (nodeNum: number) => void;
  /** A relay byte as shown (`Name (0x5A)`), or undefined for none. */
  relayLabel?: (relayNode: number | undefined) => string | undefined;
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
const NO_CANDIDATES: readonly MentionSuggestion[] = [];

interface ReplyTarget {
  readonly id: number;
  readonly name: string;
  /** As received: mentions are named when shown, so renames show. */
  readonly text: string;
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
  mentionName = NO_MENTION_NAMES,
  mentionCandidates = NO_CANDIDATES,
  onOpenNode,
  relayLabel,
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
  const emoji = useEmojiPrefs();
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
  const details = useMemo(
    () =>
      detailsKey === undefined
        ? undefined
        : messages.find((m) => messageKey(m.message) === detailsKey),
    [messages, detailsKey],
  );
  const detailsRelay = details
    ? relayLabel?.(shownRelayNode(details.message, details.outgoing))
    : undefined;

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

  // Adds my tapback, or takes it back if I'd already sent that one.
  const toggleReaction = useCallback(
    (targetId: number, reaction: string) => {
      void actions
        .toggleReaction({ targetId, emoji: reaction, destination, channel })
        .then((result) => {
          if (Result.isError(result)) {
            failToast(t("thread.reactionFailed"));
          }
        });
    },
    [actions, destination, channel, failToast, t],
  );

  const handlers = useMemo<MessageListHandlers>(
    () => ({
      react: (thread: ThreadMessage, reaction: string) =>
        toggleReaction(thread.message.id, reaction),
      reply: (thread: ThreadMessage) => {
        setReply({
          id: thread.message.id,
          name: thread.outgoing
            ? t("reply.yourself")
            : nameOf(thread.message.from),
          text: thread.message.text,
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
        // As shown: names, not the mention tokens.
        clipboard
          .writeText(mentionsToText(thread.message.text, mentionName))
          .then(() => toast({ title: t("thread.copied") }))
          .catch(() => failToast(t("thread.copyFailed")));
      },
      deliveryDetails: (thread: ThreadMessage) =>
        setDetailsKey(messageKey(thread.message)),
      retry: (thread: ThreadMessage) => retry(thread.message.id),
      retryReaction: retry,
      ...(onOpenNode ? { openNode: onOpenNode } : {}),
    }),
    [
      toggleReaction,
      nameOf,
      mentionName,
      onOpenNode,
      failToast,
      toast,
      retry,
      t,
    ],
  );
  const mentions = useMemo<ComposerMentions>(
    () => ({ candidates: mentionCandidates, name: mentionName }),
    [mentionCandidates, mentionName],
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
        emoji={emoji}
        touch={touch}
        locale={locale}
        {...(lora ? { lora } : {})}
        announce={!muted}
        mentionName={mentionName}
        {...(myNodeNum === undefined ? {} : { myNodeNum })}
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
        mentions={mentions}
        disabled={!connected}
        {...(reply
          ? {
              replying: {
                id: reply.id,
                name: reply.name,
                excerpt: excerpt(mentionsToText(reply.text, mentionName)),
              },
            }
          : {})}
        onCancelReply={() => {
          setReply(undefined);
          composerRef.current?.focus();
        }}
        emoji={emoji}
        onTapback={(reaction) => {
          if (reply) {
            toggleReaction(reply.id, reaction);
            setReply(undefined);
          }
        }}
        touch={touch}
      />
      <DeliveryDetailsDialog
        message={details?.message}
        outgoing={details?.outgoing ?? true}
        {...(detailsRelay === undefined ? {} : { relay: detailsRelay })}
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
