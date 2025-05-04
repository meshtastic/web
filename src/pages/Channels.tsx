import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@components/UI/Tabs.tsx";
import { Channel } from "@components/PageComponents/Channel.tsx";
import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Types } from "@meshtastic/core";
import type { Protobuf } from "@meshtastic/core";
import { ImportIcon, QrCodeIcon } from "lucide-react";
import { useState } from "react";

export const getChannelName = (channel: Protobuf.Channel.Channel) =>
  channel.settings?.name.length
    ? channel.settings?.name
    : channel.index === 0
    ? "Primary"
    : `Ch ${channel.index}`;

const ChannelsPage = () => {
  const { channels, setDialogOpen } = useDevice();
  const [activeChannel] = useState<Types.ChannelNumber>(
    Types.ChannelNumber.Primary,
  );

  const currentChannel = channels.get(activeChannel);
  const allChannels = Array.from(channels.values());

  return (
    <>
      <PageLayout
        leftBar={<Sidebar />}
        label={`Channel: ${
          currentChannel ? getChannelName(currentChannel) : "Loading..."
        }`}
        actions={[
          {
            key: "search",
            icon: ImportIcon,
            onClick() {
              setDialogOpen("import", true);
            },
          },
          {
            key: "import",
            icon: QrCodeIcon,
            onClick() {
              setDialogOpen("QR", true);
            },
          },
        ]}
      >
        <Tabs defaultValue="0">
          <TabsList className="dark:bg-slate-800 ">
            {allChannels.map((channel) => (
              <TabsTrigger
                key={channel.index}
                value={channel.index.toString()}
                className="dark:text-white"
              >
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
export default ChannelsPage;
