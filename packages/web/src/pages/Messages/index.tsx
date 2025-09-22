import { messagesWithParamsRoute } from "@app/routes.tsx";
import { usePageHeader } from "@components/Header/index.ts";
import { ChannelChat } from "@components/PageComponents/Messages/ChannelChat.tsx";
import { MessageInput } from "@components/PageComponents/Messages/MessageInput.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import {
  MessageState,
  MessageType,
  useDevice,
  useMessages,
  useNodeDB,
} from "@core/stores";
import type { ActionItem } from "@core/stores/headerStore";
import { randId } from "@core/utils/randId.ts";
import { Protobuf, Types } from "@meshtastic/core";
import { getChannelName } from "@pages/Config/ChannelConfig.tsx";
import { useNavigate, useParams } from "@tanstack/react-router";
import { LockIcon, LockOpenIcon, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

function SelectMessageChat() {
  const { t } = useTranslation("messages");
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-slate-500">
        <MessageCircle className="h-12 w-12 opacity-50" />
        <span>{t("selectChatPrompt.text", { ns: "messages" })}</span>
      </div>
    </div>
  );
}

export const MessagesPage = () => {
  const { channels, connection } = useDevice();
  const { getNode, getMyNode } = useNodeDB();
  const { getMessages, setMessageState } = useMessages();

  const { type, chatId } = useParams({ from: messagesWithParamsRoute.id });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation(["messages", "channels", "ui"]);

  const navigateToChat = useCallback(
    (type: MessageType, id: string) => {
      const typeParam = type === MessageType.Direct ? "direct" : "broadcast";
      navigate({ to: `/messages/${typeParam}/${id}` });
    },
    [navigate],
  );

  const chatType =
    type === "direct" ? MessageType.Direct : MessageType.Broadcast;
  const numericChatId = Number(chatId);

  const allChannels = Array.from(channels.values());
  const filteredChannels = allChannels.filter(
    (ch) => ch.role !== Protobuf.Channel.Channel_Role.DISABLED,
  );

  useEffect(() => {
    if (!type && !chatId && filteredChannels.length > 0) {
      const defaultChannel = filteredChannels[0];
      navigateToChat(
        MessageType.Broadcast,
        defaultChannel?.index.toString() ?? "0",
      );
    }
  }, [type, chatId, filteredChannels, navigateToChat]);

  const currentChannel = channels.get(numericChatId);
  const otherNode = getNode(numericChatId);

  const isDirect = chatType === MessageType.Direct;
  const isBroadcast = chatType === MessageType.Broadcast;

  // const filteredNodes = useCallback((): NodeInfoWithUnread[] => {
  //   const q = deferredSearch.toLowerCase();
  //   return getNodes((node: Protobuf.Mesh.NodeInfo) => {
  //     const longName = node.user?.longName?.toLowerCase() ?? "";
  //     const shortName = node.user?.shortName?.toLowerCase() ?? "";
  //     return longName.includes(q) || shortName.includes(q);
  //   })
  //     .map((node: Protobuf.Mesh.NodeInfo) => ({
  //       ...node,
  //       unreadCount: getUnreadCount(node.num) ?? 0,
  //     }))
  //     .sort((a: NodeInfoWithUnread, b: NodeInfoWithUnread) => {
  //       const diff = b.unreadCount - a.unreadCount;
  //       if (diff !== 0) {
  //         return diff;
  //       }
  //       return Number(b.isFavorite) - Number(a.isFavorite);
  //     });
  // }, [deferredSearch, getNodes, getUnreadCount]);

  const sendText = useCallback(
    async (message: string) => {
      const toValue = isDirect ? numericChatId : MessageType.Broadcast;
      const channelValue = isDirect
        ? Types.ChannelNumber.Primary
        : numericChatId;

      let messageId: number | undefined;

      try {
        messageId = await connection?.sendText(
          message,
          toValue,
          true,
          channelValue,
        );
        if (messageId !== undefined) {
          if (chatType === MessageType.Broadcast) {
            setMessageState({
              type: MessageType.Broadcast,
              channelId: channelValue,
              messageId,
              newState: MessageState.Ack,
            });
          } else {
            setMessageState({
              type: MessageType.Direct,
              nodeA: getMyNode().num,
              nodeB: numericChatId,
              messageId,
              newState: MessageState.Ack,
            });
          }
        } else {
          console.warn("sendText completed but messageId is undefined");
        }
      } catch (e: unknown) {
        console.error("Failed to send message:", e);
        const failedId = messageId ?? randId();
        if (chatType === MessageType.Broadcast) {
          setMessageState({
            type: MessageType.Broadcast,
            channelId: channelValue,
            messageId: failedId,
            newState: MessageState.Failed,
          });
        } else {
          setMessageState({
            type: MessageType.Direct,
            nodeA: getMyNode().num,
            nodeB: numericChatId,
            messageId: failedId,
            newState: MessageState.Failed,
          });
        }
      }
    },
    [numericChatId, chatType, connection, getMyNode, setMessageState, isDirect],
  );

  const renderChatContent = () => {
    switch (chatType) {
      case MessageType.Broadcast:
        return (
          <ChannelChat
            messages={getMessages({
              type: MessageType.Broadcast,
              channelId: numericChatId,
            }).reverse()}
          />
        );
      case MessageType.Direct:
        return (
          <ChannelChat
            messages={getMessages({
              type: MessageType.Direct,
              nodeA: getMyNode().num,
              nodeB: numericChatId,
            }).reverse()}
          />
        );
      default:
        return <SelectMessageChat />;
    }
  };

  const headerTitle = useMemo(() => {
    return t("page.title", {
      interpolation: { escapeValue: false },
      chatName:
        isBroadcast && currentChannel
          ? getChannelName(currentChannel)
          : isDirect && otherNode
            ? (otherNode.user?.longName ?? t("unknown.longName"))
            : t("emptyState.title"),
    });
  }, [t, isBroadcast, currentChannel, isDirect, otherNode]);

  const headerActions = useMemo<ActionItem[]>(() => {
    if (!(isDirect && otherNode)) {
      return [];
    }
    return [
      {
        key: "encryption",
        icon: otherNode.user?.publicKey?.length ? LockIcon : LockOpenIcon,
        iconClasses: otherNode.user?.publicKey?.length
          ? "text-green-600"
          : "text-yellow-300",
        onClick() {
          toast({
            title: otherNode.user?.publicKey?.length
              ? t("toast.messages.pkiEncryption.title")
              : t("toast.messages.pskEncryption.title"),
          });
        },
        label: undefined, // add a label if you want visible text
      },
    ];
  }, [isDirect, otherNode, t, toast]);

  usePageHeader({ title: headerTitle, actions: headerActions });

  return (
    <div className="flex h-full min-h-0">
      <div className="w-full flex flex-col">
        <div className="flex flex-1 flex-col overflow-hidden px-2">
          {renderChatContent()}

          <div className="flex-none p-2">
            {isBroadcast || isDirect ? (
              <MessageInput
                to={isDirect ? numericChatId : MessageType.Broadcast}
                onSend={sendText}
                maxBytes={200}
              />
            ) : (
              <div className="p-4 text-center text-slate-400 italic">
                {t("sendMessage.sendButton", { ns: "messages" })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
