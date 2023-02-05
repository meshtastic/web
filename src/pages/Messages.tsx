import { Sidebar } from "@app/components/Sidebar.js";
import { PageLayout } from "@app/components/Topbar.js";
import { ChannelChat } from "@components/PageComponents/Messages/ChannelChat.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { EditIcon, HashIcon } from "lucide-react";
import { Protobuf, Types } from "@meshtastic/meshtasticjs";
import { SidebarSection } from "@app/components/UI/Sidebar/SidebarSection.js";
import { SidebarItem } from "@app/components/UI/Sidebar/SidebarItem.js";
import { useState } from "react";
import { getChannelName } from "./Channels.js";

export const MessagesPage = (): JSX.Element => {
  const { channels, setActivePage, nodes, hardware } = useDevice();
  const [activeChannel, setActiveChannel] = useState<Types.ChannelNumber>(
    Types.ChannelNumber.PRIMARY
  );

  const tabs = channels.map((channel) => {
    return {
      label: channel.config.settings?.name.length
        ? channel.config.settings?.name
        : channel.config.index === 0
        ? "Primary"
        : `Ch ${channel.config.index}`,
      element: () => <ChannelChat channel={channel} />,
      disabled: channel.config.role === Protobuf.Channel_Role.DISABLED
    };
  });

  return (
    <>
      <Sidebar>
        <SidebarSection
          title="Channels"
          action={{
            icon: EditIcon,
            onClick() {
              setActivePage("channels");
            }
          }}
        >
          {channels
            .filter((ch) => ch.config.role !== Protobuf.Channel_Role.DISABLED)
            .map((channel) => (
              <SidebarItem
                key={channel.config.index}
                label={
                  channel.config.settings?.name.length
                    ? channel.config.settings?.name
                    : channel.config.index === 0
                    ? "Primary"
                    : `Ch ${channel.config.index}`
                }
                icon={HashIcon}
              />
            ))}
        </SidebarSection>
        <SidebarSection title="Peers">
          {nodes
            .filter((n) => n.data.num !== hardware.myNodeNum)
            .map((node) => (
              <SidebarItem
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
        title={`Messages: ${
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
