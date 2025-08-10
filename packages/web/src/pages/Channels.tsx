import { Channel } from "@components/PageComponents/Channel.tsx";
import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@components/UI/Tabs.tsx";
import { useDevice } from "@core/stores";
import type { Protobuf } from "@meshtastic/core";
import { Types } from "@meshtastic/core";
import i18next from "i18next";
import { QrCodeIcon, UploadIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const getChannelName = (channel: Protobuf.Channel.Channel) => {
  return channel.settings?.name.length
    ? channel.settings?.name
    : channel.index === 0
      ? i18next.t("page.broadcastLabel")
      : i18next.t("page.channelIndex", {
          ns: "channels",
          index: channel.index,
        });
};

const ChannelsPage = () => {
  const { t } = useTranslation("channels");
  const { channels, setDialogOpen } = useDevice();
  const [activeChannel] = useState<Types.ChannelNumber>(
    Types.ChannelNumber.Primary,
  );

  const currentChannel = channels.get(activeChannel);
  const allChannels = Array.from(channels.values());

  return (
    <PageLayout
      contentClassName="overflow-auto"
      leftBar={<Sidebar />}
      label={
        currentChannel
          ? getChannelName(currentChannel)
          : t("loading", { ns: "common" })
      }
      actions={[
        {
          key: "import",
          icon: UploadIcon,
          onClick() {
            setDialogOpen("import", true);
          },
        },
        {
          key: "qr",
          icon: QrCodeIcon,
          onClick() {
            setDialogOpen("QR", true);
          },
        },
      ]}
    >
      <Tabs defaultValue="0">
        <TabsList className="dark:bg-slate-800">
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
  );
};
export default ChannelsPage;
