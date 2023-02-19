import { Sidebar } from "@components/Sidebar.js";
import { PageLayout } from "@components/PageLayout.js";
import { ChannelChat } from "@components/PageComponents/Messages/ChannelChat.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { HashIcon } from "lucide-react";
import { Protobuf, Types } from "@meshtastic/meshtasticjs";
import { SidebarSection } from "@components/UI/Sidebar/SidebarSection.js";
import { useMemo, useState } from "react";
import { getChannelName } from "./Channels.js";
import { SidebarButton } from "@components/UI/Sidebar/sidebarButton.js";

export const MessagesPage = (): JSX.Element => {
  const { channels, nodes, hardware, messages } = useDevice();
  const [chatType, setChatType] =
    useState<Types.PacketDestination>("broadcast");
  const [activeChat, setActiveChat] = useState<number>(
    Types.ChannelNumber.PRIMARY
  );
  const filteredNodes = Array.from(nodes.values()).filter(
    (n) => n.num !== hardware.myNodeNum
  );

  return (
    <>
      <Sidebar>
        <SidebarSection label="Channels">
          {channels
            .filter((ch) => ch.role !== Protobuf.Channel_Role.DISABLED)
            .map((channel) => (
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
          chatType === "broadcast" && channels[activeChat]
            ? getChannelName(channels[activeChat])
            : chatType === "direct" && nodes.get(activeChat)
            ? nodes.get(activeChat)?.user?.longName ?? "Unknown"
            : "Loading..."
        }`}
      >
        {channels.map(
          (channel) =>
            activeChat === channel.index && (
              <ChannelChat
                key={channel.index}
                to="broadcast"
                messages={messages.broadcast.get(channel.index)}
                channel={channel.index}
              />
            )
        )}
        {filteredNodes.map(
          (node) =>
            activeChat === node.num && (
              <ChannelChat
                key={node.num}
                to={activeChat}
                messages={messages.direct.get(node.num)}
                channel={Types.ChannelNumber.PRIMARY}
              />
            )
        )}
      </PageLayout>
    </>
  );
};
