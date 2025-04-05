import { ChannelChat } from "@components/PageComponents/Messages/ChannelChat.tsx";
import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { Avatar } from "@components/UI/Avatar.tsx";
import { SidebarSection } from "@components/UI/Sidebar/SidebarSection.tsx";
import { SidebarButton } from "@components/UI/Sidebar/sidebarButton.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf, Types } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { getChannelName } from "@pages/Channels.tsx";
import { HashIcon, LockIcon, LockOpenIcon } from "lucide-react";
import { useState } from "react";
import { MessageInput } from "@components/PageComponents/Messages/MessageInput.tsx";
import { cn } from "@core/utils/cn.ts";
import { MessageType, useMessageStore } from "@core/stores/messageStore.ts";

type NodeInfoWithUnread = Protobuf.Mesh.NodeInfo & { unreadCount: number };

export const MessagesPage = () => {
  const { channels, nodes, hardware, hasNodeError, unreadCounts, resetUnread } = useDevice();
  const { getNodeNum, getMessages, setActiveChat, chatType, activeChat, setChatType } = useMessageStore()
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState<string>("");

  const filteredNodes: NodeInfoWithUnread[] = Array.from(nodes.values())
    .filter((node) => node.num !== hardware.myNodeNum)
    .map((node) => ({
      ...node,
      unreadCount: unreadCounts.get(node.num) ?? 0,
    }))
    .filter((node) => {
      const nodeName = node.user?.longName ?? `!${numberToHexUnpadded(node.num)}`;
      return nodeName.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => b.unreadCount - a.unreadCount);


  const allChannels = Array.from(channels.values());
  const filteredChannels = allChannels.filter(
    (ch) => ch.role !== Protobuf.Channel.Channel_Role.DISABLED,
  );
  const currentChannel = channels.get(activeChat);

  const otherNode = nodes.get(activeChat);

  const nodeHex = otherNode?.num ? numberToHexUnpadded(otherNode.num) : "Unknown";

  const isDirect = chatType === MessageType.Direct;
  const isBroadcast = chatType === MessageType.Broadcast;

  const currentChat = { type: chatType, id: activeChat };

  return (
    <>
      <Sidebar>
        <SidebarSection label="Channels">
          {filteredChannels.map((channel) => (
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
              element={<HashIcon size={16} className="mr-2" />}
            />
          ))}
        </SidebarSection>
        <SidebarSection label="Nodes">
          <div className="p-1 mb-4">
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-sm bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-3.5">
            {filteredNodes.map((node) => (
              <SidebarButton
                key={node.num}
                label={node.user?.longName ?? `!${numberToHexUnpadded(node.num)}`}
                count={node.unreadCount > 0 ? node.unreadCount : undefined}
                active={activeChat === node.num && chatType === MessageType.Direct}
                onClick={() => {
                  setChatType(MessageType.Direct);
                  setActiveChat(node.num);
                  resetUnread(node.num);
                }}
                element={
                  <Avatar
                    text={node.user?.shortName ?? node.num.toString()}
                    className={cn(hasNodeError(node.num) && "text-red-500")}
                    showError={hasNodeError(node.num)}
                    size="sm"
                  />
                }
              />
            ))}
          </div>
        </SidebarSection>
      </Sidebar>
      <div className="flex flex-col w-full h-full container mx-auto">
        <PageLayout
          className="flex flex-col h-full"
          label={`Messages: ${isBroadcast && currentChannel
            ? getChannelName(currentChannel)
            : isDirect && otherNode
              ? (otherNode.user?.longName ?? nodeHex)
              : "Select a Chat"
            }`}
          actions={isDirect && otherNode
            ? [
              {
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
          <div className="flex-1 overflow-y-auto">
            {isBroadcast && currentChannel && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto">
                  <ChannelChat
                    messages={getMessages(MessageType.Broadcast, {
                      myNodeNum: getNodeNum(),
                      channel: currentChannel?.index
                    })}
                  />
                </div>
              </div>
            )}

            {isDirect && otherNode && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto">
                  <ChannelChat
                    messages={getMessages(MessageType.Direct, { myNodeNum: getNodeNum(), otherNodeNum: activeChat })}
                  />
                </div>
              </div>
            )}

            {!isBroadcast && !isDirect && (
              <div className="flex items-center justify-center h-full text-slate-500">
                Select a channel or node to start messaging.
              </div>
            )}
          </div>

          <div className="shrink-0 p-4 w-full dark:bg-slate-900">
            {(isBroadcast || isDirect) ? (
              <MessageInput
                to={isDirect ? activeChat : MessageType.Broadcast}
                channel={isDirect ? Types.ChannelNumber.Primary : currentChat.id}
                maxBytes={200}
              />
            ) : (
              <div className="text-center text-slate-400 italic">Select a chat to send a message.</div>
            )}
          </div>
        </PageLayout>
      </div>
    </>
  );
};

export default MessagesPage;