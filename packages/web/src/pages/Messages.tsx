import { messagesWithParamsRoute } from "@app/routes.tsx";
import { ChannelChat } from "@components/PageComponents/Messages/ChannelChat.tsx";
import { MessageInput } from "@components/PageComponents/Messages/MessageInput.tsx";
import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { Avatar } from "@components/UI/Avatar.tsx";
import { Input } from "@components/UI/Input.tsx";
import { SidebarButton } from "@components/UI/Sidebar/SidebarButton.tsx";
import { SidebarSection } from "@components/UI/Sidebar/SidebarSection.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import {
  MessageState,
  MessageType,
  useDevice,
  useMessages,
  useNodeDB,
  useSidebar,
} from "@core/stores";
import { cn } from "@core/utils/cn.ts";
import { randId } from "@core/utils/randId.ts";
import { Protobuf, Types } from "@meshtastic/core";
import { useNavigate, useParams } from "@tanstack/react-router";
import { HashIcon, LockIcon, LockOpenIcon } from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { getChannelName } from "../components/PageComponents/Channels/Channels.tsx";

type NodeInfoWithUnread = Protobuf.Mesh.NodeInfo & { unreadCount: number };

function SelectMessageChat() {
  const { t } = useTranslation("messages");
  return (
    <div className="flex-1 flex items-center justify-center text-slate-500 p-4">
      {t("selectChatPrompt.text", { ns: "messages" })}
    </div>
  );
}

export const MessagesPage = () => {
  const { channels, getUnreadCount, resetUnread, connection } = useDevice();
  const { getNodes, getNode, getMyNode, hasNodeError } = useNodeDB();

  const { getMessages, setMessageState } = useMessages();

  const { type, chatId } = useParams({ from: messagesWithParamsRoute.id });

  const navigate = useNavigate();
  const { toast } = useToast();
  const { isCollapsed } = useSidebar();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { t } = useTranslation(["messages", "channels", "ui"]);
  const deferredSearch = useDeferredValue(searchTerm);

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

  const filteredNodes = useCallback((): NodeInfoWithUnread[] => {
    const lowerCaseSearchTerm = deferredSearch.toLowerCase();

    return getNodes((node: Protobuf.Mesh.NodeInfo) => {
      const longName = node.user?.longName?.toLowerCase() ?? "";
      const shortName = node.user?.shortName?.toLowerCase() ?? "";
      return (
        longName.includes(lowerCaseSearchTerm) ||
        shortName.includes(lowerCaseSearchTerm)
      );
    }, true)
      .map((node: Protobuf.Mesh.NodeInfo) => ({
        ...node,
        unreadCount: getUnreadCount(node.num) ?? 0,
      }))
      .sort((a: NodeInfoWithUnread, b: NodeInfoWithUnread) => {
        const diff = b.unreadCount - a.unreadCount;
        if (diff !== 0) {
          return diff;
        }
        return Number(b.isFavorite) - Number(a.isFavorite);
      });
  }, [deferredSearch, getNodes, getUnreadCount]);

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

  const leftSidebar = useMemo(
    () => (
      <Sidebar>
        <SidebarSection label={t("navigation.channels")} className="py-2 px-0">
          {filteredChannels?.map((channel) => (
            <SidebarButton
              key={channel.index}
              count={getUnreadCount(channel.index)}
              label={
                channel.settings?.name ||
                (channel.index === 0
                  ? t("page.broadcastLabel", { ns: "channels" })
                  : t("page.channelLabel", {
                      index: channel.index,
                      ns: "channels",
                    }))
              }
              active={
                numericChatId === channel.index &&
                chatType === MessageType.Broadcast
              }
              onClick={() => {
                navigateToChat(MessageType.Broadcast, channel.index.toString());
                resetUnread(channel.index);
              }}
            >
              <HashIcon
                size={16}
                className={cn(isCollapsed ? "mr-0 mt-2" : "mr-2")}
              />
            </SidebarButton>
          ))}
        </SidebarSection>
      </Sidebar>
    ),
    [
      filteredChannels,
      numericChatId,
      chatType,
      isCollapsed,
      getUnreadCount,
      navigateToChat,
      resetUnread,
      t,
    ],
  );

  const rightSidebar = (
    <SidebarSection
      label=""
      className="px-0 flex flex-col h-full overflow-y-auto"
    >
      <label className="p-2 block" htmlFor="nodeSearch">
        <Input
          type="text"
          name="nodeSearch"
          placeholder={t("search.nodes")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          showClearButton={!!searchTerm}
        />
      </label>
      <div
        className={cn(
          "flex flex-col h-full flex-1 overflow-y-auto gap-2.5 pt-1 ",
        )}
        style={{ contentVisibility: "auto", containIntrinsicSize: "100px" }}
      >
        {filteredNodes()?.map((node) => (
          <SidebarButton
            key={node.num}
            preventCollapse
            label={node.user?.longName ?? t("unknown.shortName")}
            count={node.unreadCount > 0 ? node.unreadCount : undefined}
            active={
              numericChatId === node.num && chatType === MessageType.Direct
            }
            onClick={() => {
              navigateToChat(MessageType.Direct, node.num.toString());
              resetUnread(node.num);
            }}
          >
            <Avatar
              text={node.user?.shortName ?? t("unknown.shortName")}
              className={cn(hasNodeError(node.num) && "text-red-500")}
              showError={hasNodeError(node.num)}
              showFavorite={node.isFavorite}
              size="sm"
            />
          </SidebarButton>
        ))}
      </div>
    </SidebarSection>
  );

  return (
    <PageLayout
      label={`${t("page.title", {
        interpolation: { escapeValue: false },
        chatName:
          isBroadcast && currentChannel
            ? getChannelName(currentChannel)
            : isDirect && otherNode
              ? (otherNode.user?.longName ?? t("unknown.longName"))
              : t("emptyState.title"),
      })} 
      `}
      rightBar={rightSidebar}
      leftBar={leftSidebar}
      actions={
        isDirect && otherNode
          ? [
              {
                key: "encryption",
                icon: otherNode.user?.publicKey?.length
                  ? LockIcon
                  : LockOpenIcon,
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
              },
            ]
          : []
      }
    >
      <div className="flex flex-1 flex-col overflow-hidden">
        {renderChatContent()}

        <div className="flex-none dark:bg-slate-900 p-2">
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
    </PageLayout>
  );
};

export default MessagesPage;
