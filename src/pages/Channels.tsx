import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@app/components/UI/Tabs.js";
import { cn } from "@app/core/utils/cn.js";
import { Channel } from "@components/PageComponents/Channel.js";
import { PageLayout } from "@components/PageLayout.js";
import { Sidebar } from "@components/Sidebar.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Protobuf, Types } from "@meshtastic/meshtasticjs";
import { ImportIcon, QrCodeIcon } from "lucide-react";
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
    Types.ChannelNumber.PRIMARY,
  );

  const currentChannel = channels.get(activeChannel);
  const allChannels = Array.from(channels.values());

  return (
    <>
      <Sidebar />
      <PageLayout
        label={`Channel: ${
          currentChannel ? getChannelName(currentChannel) : "Loading..."
        }`}
        actions={[
          {
            icon: ImportIcon,
            onClick() {
              setDialogOpen("import", true);
            },
          },
          {
            icon: QrCodeIcon,
            onClick() {
              setDialogOpen("QR", true);
            },
          },
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
