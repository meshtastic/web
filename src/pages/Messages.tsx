import { useAppStore } from "../core/stores/appStore.ts";
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

export const MessagesPage = () => {
  const { channels, nodes, hardware, messages, hasNodeError } = useDevice();
  const { activeChat, chatType, setActiveChat, setChatType } = useAppStore();
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
  const { toast } = useToast();
  const node = nodes.get(activeChat);
  const nodeHex = node?.num ? numberToHexUnpadded(node.num) : "Unknown";

  const messageDestination = chatType === "direct" ? activeChat : "broadcast";
  const messageChannel = chatType === "direct"
    ? Types.ChannelNumber.Primary
    : activeChat;

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
              active={activeChat === channel.index && chatType === "broadcast"}
              onClick={() => {
                setChatType("broadcast");
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
            {filteredNodes.map((node) => (
              <SidebarButton
                key={node.num}
                label={node.user?.longName ??
                  `!${numberToHexUnpadded(node.num)}`}
                active={activeChat === node.num && chatType === "direct"}
                onClick={() => {
                  setChatType("direct");
                  setActiveChat(node.num);
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
          label={`Messages: ${chatType === "broadcast" && currentChannel
            ? getChannelName(currentChannel)
            : chatType === "direct" && nodes.get(activeChat)
              ? (nodes.get(activeChat)?.user?.longName ?? nodeHex)
              : "Loading..."
            }`}
          actions={chatType === "direct"
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
            {chatType === "broadcast" && currentChannel && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto">
                  <ChannelChat
                    key={currentChannel.index}
                    messages={messages.broadcast.get(currentChannel.index)}
                  />
                </div>
              </div>
            )}

            {chatType === "direct" && node && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto">
                  <ChannelChat
                    key={node.num}
                    messages={messages.direct.get(node.num)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 p-4 w-full dark:bg-slate-900">
            <MessageInput
              to={messageDestination}
              channel={messageChannel}
              maxBytes={200}
            />
          </div>
        </PageLayout>
      </div>
    </>
  );
};

export default MessagesPage;