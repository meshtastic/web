import { Sidebar } from "@app/components/Sidebar.js";
import { PageLayout } from "@app/components/Topbar.js";
import { ChannelChat } from "@components/PageComponents/Messages/ChannelChat.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { HashIcon } from "lucide-react";
import { Protobuf, Types } from "@meshtastic/meshtasticjs";
import { SidebarSection } from "@app/components/UI/Sidebar/SidebarSection.js";
import { useState } from "react";
import { getChannelName } from "./Channels.js";
import { SidebarButton } from "@app/components/UI/Sidebar/sidebarButton.js";

export const MessagesPage = (): JSX.Element => {
  const { channels, nodes, hardware } = useDevice();
  const [activeChannel, setActiveChannel] = useState<Types.ChannelNumber>(
    Types.ChannelNumber.PRIMARY
  );

  return (
    <>
      <Sidebar>
        <SidebarSection label="Channels">
          {channels
            .filter((ch) => ch.config.role !== Protobuf.Channel_Role.DISABLED)
            .map((channel) => (
              <SidebarButton
                key={channel.config.index}
                label={
                  channel.config.settings?.name.length
                    ? channel.config.settings?.name
                    : channel.config.index === 0
                    ? "Primary"
                    : `Ch ${channel.config.index}`
                }
                active={channel.config.index === activeChannel}
                onClick={() => setActiveChannel(channel.config.index)}
                element={<HashIcon size={16} className="mr-2" />}
              />
            ))}
        </SidebarSection>
        <SidebarSection label="Peers">
          {nodes
            .filter((n) => n.data.num !== hardware.myNodeNum)
            .map((node) => (
              <SidebarButton
                key={node.data.num}
                label={node.data.user?.longName ?? "Unknown"}
                element={
                  <Hashicon size={20} value={node.data.num.toString()} />
                }
              />
            ))}
        </SidebarSection>
      </Sidebar>
      <PageLayout
        label={`Messages: ${
          channels[activeChannel]
            ? getChannelName(channels[activeChannel].config)
            : "Loading..."
        }`}
      >
        {channels.map(
          (channel) =>
            channel.config.index === activeChannel && (
              <ChannelChat key={channel.config.index} channel={channel} />
            )
        )}
      </PageLayout>
    </>
  );
};
