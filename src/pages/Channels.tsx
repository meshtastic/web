import { Sidebar } from "@components/Sidebar.js";
import { PageLayout } from "@components/PageLayout.js";
import { cn } from "@app/core/utils/cn.js";
import { Channel } from "@components/PageComponents/Channel.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { QrCodeIcon, ImportIcon } from "lucide-react";
import { Protobuf, Types } from "@meshtastic/meshtasticjs";
import { SidebarSection } from "@components/UI/Sidebar/SidebarSection.js";
import { useState } from "react";
import { Button } from "@components/UI/Button.js";
import { SidebarButton } from "@components/UI/Sidebar/sidebarButton.js";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@app/components/UI/Tabs.js";

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
      <Sidebar></Sidebar>
      <PageLayout
        label={`Channel: ${
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
        <Tabs defaultValue="0">
          <TabsList>
            {channels.map((channel) => (
              <TabsTrigger
                key={channel.config.index}
                value={channel.config.index.toString()}
              >
                {getChannelName(channel.config)}
              </TabsTrigger>
            ))}
          </TabsList>
          {channels.map((channel) => (
            <TabsContent
              key={channel.config.index}
              value={channel.config.index.toString()}
            >
              <Channel key={channel.config.index} channel={channel.config} />
            </TabsContent>
          ))}
        </Tabs>
      </PageLayout>
    </>
  );
};
