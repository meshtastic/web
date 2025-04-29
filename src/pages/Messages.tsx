import { ChannelChat } from "@components/PageComponents/Messages/ChannelChat.tsx";
import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { Avatar } from "@components/UI/Avatar.tsx";
import { SidebarSection } from "@components/UI/Sidebar/SidebarSection.tsx";
import { SidebarButton } from "@components/UI/Sidebar/sidebarButton.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf, Types } from "@meshtastic/core";
import { getChannelName } from "@pages/Channels.tsx";
import { HashIcon, LockIcon, LockOpenIcon } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { MessageInput } from "@components/PageComponents/Messages/MessageInput.tsx";
import { cn } from "@core/utils/cn.ts";
import { MessageType, useMessageStore } from "@core/stores/messageStore.ts";
import { useSidebar } from "@core/stores/sidebarStore.tsx";
import { Input } from "@components/UI/Input.tsx";

type NodeInfoWithUnread = Protobuf.Mesh.NodeInfo & { unreadCount: number };

export const MessagesPage = () => {
  const { channels, getNodes, getNode, hasNodeError, unreadCounts, resetUnread } = useDevice();
  const { getNodeNum, getMessages, setActiveChat, chatType, activeChat, setChatType } = useMessageStore()
  const { toast } = useToast();
  const { isCollapsed } = useSidebar()
  const [searchTerm, setSearchTerm] = useState<string>("");
  const deferredSearch = useDeferredValue(searchTerm);


  const filteredNodes = (): NodeInfoWithUnread[] => {
    const lowerCaseSearchTerm = deferredSearch.toLowerCase();

    return getNodes(node => {
      const longName = node.user?.longName?.toLowerCase() ?? '';
      const shortName = node.user?.shortName?.toLowerCase() ?? '';
      return longName.includes(lowerCaseSearchTerm) || shortName.includes(lowerCaseSearchTerm)
    })
      .map((node) => ({
        ...node,
        unreadCount: unreadCounts.get(node.num) ?? 0,
      }))
      .sort((a, b) => b.unreadCount - a.unreadCount);
  }


  const allChannels = Array.from(channels.values());
  const filteredChannels = allChannels.filter(
    (ch) => ch.role !== Protobuf.Channel.Channel_Role.DISABLED,
  );
  const currentChannel = channels.get(activeChat);

  const otherNode = getNode(activeChat);

  const isDirect = chatType === MessageType.Direct;
  const isBroadcast = chatType === MessageType.Broadcast;

  const currentChat = { type: chatType, id: activeChat };

  const renderChatContent = () => {
    switch (chatType) {
      case MessageType.Broadcast:
        return (
          <ChannelChat
            messages={getMessages(MessageType.Broadcast, {
              myNodeNum: getNodeNum(),
              channel: currentChannel?.index
            })}
          />
        );
      case MessageType.Direct:
        return (
          <ChannelChat
            messages={getMessages(MessageType.Direct, { myNodeNum: getNodeNum(), otherNodeNum: activeChat })}
          />
        );
      default:
        return (
          <div className="flex-1 flex items-center justify-center text-slate-500 p-4">
            Select a channel or node to start messaging.
          </div>
        );
    }
  }

  const leftSidebar = useMemo(() => (
    <Sidebar>
      <SidebarSection label="Channels" className="py-2 px-0">
        {filteredChannels?.map((channel) => (
          <SidebarButton
            key={channel.index}
            count={unreadCounts.get(channel.index)}
            label={channel.settings?.name || (channel.index === 0 ? "Primary" : `Ch ${channel.index}`)}
            active={activeChat === channel.index && chatType === MessageType.Broadcast}
            onClick={() => {
              setChatType(MessageType.Broadcast);
              setActiveChat(channel.index);
              resetUnread(channel.index);
            }}
          >
            <HashIcon size={16} className={cn(isCollapsed ? "mr-0 mt-2" : "mr-2")} />
          </SidebarButton>
        ))}
      </SidebarSection>
    </Sidebar>
  ), [filteredChannels, unreadCounts, activeChat, chatType, isCollapsed, setActiveChat, setChatType, resetUnread]);

  const rightSidebar = useMemo(() => (
    <SidebarSection label="" className="px-0 flex flex-col h-full overflow-y-auto">
      <label className="px-4 pt-4">
        <Input
          type="text"
          placeholder="Search nodes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          showClearButton={!!searchTerm}
          className={cn('relative w-full p-2 border border-slate-300 rounded-sm bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-700 focus:dark:ring-slate-100')}
        />
      </label>
      <div className={cn(
        "flex flex-col h-full flex-1 overflow-y-auto gap-2.5 pt-1 ",
      )}>
        {filteredNodes()?.map((node) => (
          <SidebarButton
            key={node.num}
            label={node.user?.longName ?? `UNK`}
            count={node.unreadCount > 0 ? node.unreadCount : undefined}
            active={activeChat === node.num && chatType === MessageType.Direct}
            onClick={() => {
              setChatType(MessageType.Direct);
              setActiveChat(node.num);
              resetUnread(node.num);
            }}>
            <Avatar
              text={node.user?.shortName ?? "UNK"}
              className={cn(hasNodeError(node.num) && "text-red-500")}
              showError={hasNodeError(node.num)}
              size="sm"
            />
          </SidebarButton>
        ))}
      </div>
    </SidebarSection>
  ), [filteredNodes, searchTerm, activeChat, chatType, setActiveChat, setChatType, resetUnread, hasNodeError]);
  return (
    <PageLayout
      label={`Messages: ${isBroadcast && currentChannel
        ? getChannelName(currentChannel)
        : isDirect && otherNode
          ? (otherNode.user?.longName ?? "Unknown")
          : "Select a Chat"
        }`}
      rightBar={rightSidebar}
      leftBar={leftSidebar}
      actions={isDirect && otherNode
        ? [
          {
            key: 'encryption',
            icon: otherNode.user?.publicKey?.length ? LockIcon : LockOpenIcon,
            iconClasses: otherNode.user?.publicKey?.length
              ? "text-green-600"
              : "text-yellow-300",
            onClick() {
              toast({
                title: otherNode.user?.publicKey?.length
                  ? "Chat is using PKI encryption."
                  : "Chat is using PSK encryption.",
              });
            },
          },
        ]
        : []}
    >
      <div className="flex flex-1 flex-col overflow-hidden">
        {renderChatContent()}

        <div className="flex-none dark:bg-slate-900 p-4">
          {(isBroadcast || isDirect) ? (
            <MessageInput
              to={isDirect ? activeChat : MessageType.Broadcast}
              channel={isDirect ? Types.ChannelNumber.Primary : currentChat.id}
              maxBytes={200}
            />
          ) : (
            <div className="p-4 text-center text-slate-400 italic">Select a chat to send a message.</div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default MessagesPage;