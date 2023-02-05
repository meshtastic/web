import { Sidebar } from "@app/components/Sidebar.js";
import { PageLayout } from "@app/components/Topbar.js";
import { cn } from "@app/core/utils/cn.js";
import { Channel } from "@components/PageComponents/Channel.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { QrCodeIcon, ImportIcon } from "lucide-react";
import { Protobuf, Types } from "@meshtastic/meshtasticjs";
import { SidebarSection } from "@app/components/UI/Sidebar/SidebarSection.js";
import { SidebarItem } from "@app/components/UI/Sidebar/SidebarItem.js";
import { useState } from "react";

export const getChannelName = (channel: Protobuf.Channel) =>
  channel.settings?.name.length
    ? channel.settings?.name
    : channel.index === 0
    ? "Primary"
    : `Ch ${channel.index}`;

export const ChannelsPage = (): JSX.Element => {
  const { channels, setDialogOpen } = useDevice();
  const [activeChannel, setActiveChannel] = useState<Types.ChannelNumber>(
    Types.ChannelNumber.PRIMARY
  );

  return (
    <>
      <Sidebar>
        <SidebarSection title="Channels">
          {channels.map((channel) => (
            <SidebarItem
              key={channel.config.index}
              active={channel.config.index === activeChannel}
              onClick={() => setActiveChannel(channel.config.index)}
              label={getChannelName(channel.config)}
              element={
                <span
                  className={cn(
                    "h-3 w-3 rounded-full",
                    channel.config.role === Protobuf.Channel_Role.DISABLED
                      ? "bg-gray-500"
                      : "bg-green-500"
                  )}
                />
              }
            />
          ))}
        </SidebarSection>
      </Sidebar>
      <PageLayout
        title={`Channel: ${
          channels[activeChannel]
            ? getChannelName(channels[activeChannel].config)
            : "Loading..."
        }`}
        actions={[
          {
            icon: ImportIcon,
            onClick() {
              console.log("fired");

              setDialogOpen("import", true);
            }
          },
          {
            icon: QrCodeIcon,
            onClick() {
              setDialogOpen("QR", true);
            }
          }
        ]}
      >
        {channels.map(
          (channel) =>
            channel.config.index === activeChannel && (
              <Channel key={channel.config.index} channel={channel.config} />
            )
        )}
      </PageLayout>
    </>
  );
};
