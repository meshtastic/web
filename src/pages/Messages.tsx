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

export const MessagesPage = () => {
  const { channels, nodes, hardware, messages, unreadCounts, setUnread } = useDevice();
  const { activeChat, chatType, setActiveChat, setChatType } = useAppStore();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const filteredNodes = Array.from(nodes.values()).filter((node) => {
    if (node.num === hardware.myNodeNum) return false;
    const nodeName = node.user?.longName ?? `!${numberToHexUnpadded(node.num)}`;
    return nodeName.toLowerCase().includes(searchTerm.toLowerCase());
  }).map((node) => { 
    node = {...node, unreadCount: unreadCounts.get(node.num) ?? 0}
    return node;
  })
  .sort((a, b) => b.unreadCount - a.unreadCount);
  const allChannels = Array.from(channels.values());
  const filteredChannels = allChannels.filter(
    (ch) => ch.role !== Protobuf.Channel.Channel_Role.DISABLED,
  );
  const currentChannel = channels.get(activeChat);
  const { toast } = useToast();
  const node = nodes.get(activeChat);
  const nodeHex = node?.num ? numberToHexUnpadded(node.num) : "Unknown";

  return (
    <>
      <Sidebar>
        <SidebarSection label="Channels">
          {filteredChannels.map((channel) => (
            <SidebarButton
              key={channel.index}
              count={unreadCounts.get(channel.index)}
              label={channel.settings?.name.length
                ? channel.settings?.name
                : channel.index === 0
                ? "Primary"
                : `Ch ${channel.index}`}
              active={activeChat === channel.index}
              onClick={() => {
                setChatType("broadcast");
                setActiveChat(channel.index);
                setUnread(channel.index, 0);
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
                count={unreadCounts.get(node.num)}
                label={node.user?.longName ??
                  `!${numberToHexUnpadded(node.num)}`}
                active={activeChat === node.num}
                onClick={() => {
                  setChatType("direct");
                  setActiveChat(node.num);
                  setUnread(node.num, 0)
                }}
                element={
                  <Avatar
                    text={node.user?.shortName ?? node.num.toString()}
                    size="sm"
                  />
                }
              />
            ))}
          </div>
        </SidebarSection>
      </Sidebar>
      <div className="flex flex-col grow">
        <PageLayout
          label={`Messages: ${
            chatType === "broadcast" && currentChannel
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
          {allChannels.map(
            (channel) =>
              activeChat === channel.index && (
                <ChannelChat
                  key={channel.index}
                  to="broadcast"
                  messages={messages.broadcast.get(channel.index)}
                  channel={channel.index}
                />
              ),
          )}
          {filteredNodes.map(
            (node) =>
              activeChat === node.num && (
                <ChannelChat
                  key={node.num}
                  to={activeChat}
                  messages={messages.direct.get(node.num)}
                  channel={Types.ChannelNumber.Primary}
                />
              ),
          )}
        </PageLayout>
      </div>
    </>
  );
};

export default MessagesPage;
