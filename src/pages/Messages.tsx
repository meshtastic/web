import { ChannelChat } from "@components/PageComponents/Messages/ChannelChat.js";
import { PageLayout } from "@components/PageLayout.js";
import { Sidebar } from "@components/Sidebar.js";
import { SidebarSection } from "@components/UI/Sidebar/SidebarSection.js";
import { SidebarButton } from "@components/UI/Sidebar/sidebarButton.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { Protobuf, Types } from "@meshtastic/js";
import { getChannelName } from "@pages/Channels.js";
import { HashIcon } from "lucide-react";
import { useState } from "react";

export const MessagesPage = (): JSX.Element => {
  const { channels, nodes, hardware, messages } = useDevice();
  const [chatType, setChatType] =
    useState<Types.PacketDestination>("broadcast");
  const [activeChat, setActiveChat] = useState<number>(
    Types.ChannelNumber.Primary,
  );
  const filteredNodes = Array.from(nodes.values()).filter(
    (n) => n.num !== hardware.myNodeNum,
  );
  const allChannels = Array.from(channels.values());
  const filteredChannels = allChannels.filter(
    (ch) => ch.role !== Protobuf.Channel.Channel_Role.DISABLED,
  );
  const currentChannel = channels.get(activeChat);

  return (
    <>
      <Sidebar>
        <SidebarSection label="Channels">
          {filteredChannels.map((channel) => (
            <SidebarButton
              key={channel.index}
              label={
                channel.settings?.name.length
                  ? channel.settings?.name
                  : channel.index === 0
                    ? "Primary"
                    : `Ch ${channel.index}`
              }
              active={activeChat === channel.index}
              onClick={() => {
                setChatType("broadcast");
                setActiveChat(channel.index);
              }}
              element={<HashIcon size={16} className="mr-2" />}
            />
          ))}
        </SidebarSection>
        <SidebarSection label="Peers">
          {filteredNodes.map((node) => (
            <SidebarButton
              key={node.num}
              label={node.user?.longName ?? "Unknown"}
              active={activeChat === node.num}
              onClick={() => {
                setChatType("direct");
                setActiveChat(node.num);
              }}
              element={<Hashicon size={20} value={node.num.toString()} />}
            />
          ))}
        </SidebarSection>
      </Sidebar>
      <PageLayout
        label={`Messages: ${
          chatType === "broadcast" && currentChannel
            ? getChannelName(currentChannel)
            : chatType === "direct" && nodes.get(activeChat)
              ? nodes.get(activeChat)?.user?.longName ?? "Unknown"
              : "Loading..."
        }`}
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
    </>
  );
};
