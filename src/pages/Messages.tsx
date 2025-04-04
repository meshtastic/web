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

export const MessagesPage = () => {
  const { channels, nodes, hardware, hasNodeError } = useDevice();
  const { getNodeNum, getMessages, setActiveChat, chatType, activeChat, setChatType } = useMessageStore()
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState<string>("");

  const filteredNodes = Array.from(nodes.values()).filter((node) => {
    if (node.num === hardware.myNodeNum) return false;
    const nodeName = node.user?.longName ?? `!${numberToHexUnpadded(node.num)}`;
    return nodeName.toLowerCase().includes(searchTerm.toLowerCase());
  });
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
              label={channel.settings?.name.length
                ? channel.settings?.name
                : channel.index === 0
                  ? "Primary"
                  : `Ch ${channel.index}`}
              onClick={() => {
                setChatType(MessageType.Broadcast);
                setActiveChat(channel.index);
              }}
              element={<HashIcon size={16} className="mr-2" />}
            />
          ))}
        </SidebarSection>
        <SidebarSection label="Nodes">
          <div className="p-4">
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-sm bg-white text-slate-900"
            />
          </div>
          <div className="flex flex-col gap-4">
            {filteredNodes.map((otherNode) => (
              <SidebarButton
                key={otherNode.num}
                label={otherNode.user?.longName ??
                  `!${numberToHexUnpadded(otherNode.num)}`}
                active={activeChat === otherNode.num && chatType === MessageType.Direct}
                onClick={() => {
                  setChatType(MessageType.Direct);
                  setActiveChat(otherNode.num);
                }}
                element={
                  <Avatar
                    text={otherNode?.user?.shortName ?? otherNode.num.toString()}
                    className={cn(hasNodeError(otherNode?.num) && "text-red-500")}
                    showError={hasNodeError(otherNode?.num)}
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
          label={`Messages: ${MessageType.Broadcast && currentChannel
            ? getChannelName(currentChannel)
            : chatType === MessageType.Direct && nodes.get(activeChat)
              ? (nodes.get(activeChat)?.user?.longName ?? nodeHex)
              : "Loading..."
            }`}
          actions={chatType === MessageType.Direct
            ? [
              {
                icon: nodes.get(activeChat)?.user?.publicKey.length
                  ? LockIcon
                  : LockOpenIcon,
                iconClasses: nodes.get(activeChat)?.user?.publicKey.length
                  ? "text-green-600"
                  : "text-yellow-300",
                onClick() {
                  const targetNode = nodes.get(activeChat)?.num;
                  if (targetNode === undefined) return;
                  toast({
                    title: nodes.get(activeChat)?.user?.publicKey.length
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
          </div>

          <div className="shrink-0 p-4 w-full dark:bg-slate-900">
            <MessageInput
              from={activeChat}
              to={currentChat.type === MessageType.Direct ? activeChat : MessageType.Broadcast}
              channel={currentChat.type === MessageType.Direct ? Types.ChannelNumber.Primary : currentChat.id}
              maxBytes={200}
            />
          </div>
        </PageLayout>
      </div>
    </>
  );
};

export default MessagesPage;