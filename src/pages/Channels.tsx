import { Sidebar } from "@components/Sidebar.js";
import { PageLayout } from "@components/PageLayout.js";
import { cn } from "@app/core/utils/cn.js";
import { Channel } from "@components/PageComponents/Channel.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { QrCodeIcon, ImportIcon } from "lucide-react";
import { Protobuf, Types } from "@meshtastic/meshtasticjs";
import { useState } from "react";
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

  const currentChannel = channels.get(activeChannel);
  const allChannels = Array.from(channels.values());

  return (
    <>
      <Sidebar></Sidebar>
      <PageLayout
        label={`Channel: ${
          currentChannel ? getChannelName(currentChannel) : "Loading..."
        }`}
        actions={[
          {
            icon: ImportIcon,
            onClick() {
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
            {allChannels.map((channel) => (
              <TabsTrigger key={channel.index} value={channel.index.toString()}>
                {getChannelName(channel)}
              </TabsTrigger>
            ))}
          </TabsList>
          {allChannels.map((channel) => (
            <TabsContent key={channel.index} value={channel.index.toString()}>
              <Channel key={channel.index} channel={channel} />
            </TabsContent>
          ))}
        </Tabs>
      </PageLayout>
    </>
  );
};
