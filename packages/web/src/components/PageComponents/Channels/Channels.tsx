import { Channel } from "@app/components/PageComponents/Channels/Channel";
import { type Channel as DbChannel, useChannels } from "@app/db";
import { Button } from "@shared/components/ui/button";
import { Spinner } from "@shared/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { useDevice, useDeviceContext } from "@core/stores";
import i18next from "i18next";
import { QrCodeIcon, UploadIcon } from "lucide-react";
import { Suspense, useMemo } from "react";
import { useTranslation } from "react-i18next";

export const getChannelName = (channel: DbChannel) => {
  return channel.name?.length
    ? channel.name
    : channel.channelIndex === 0
      ? i18next.t("page.broadcastLabel", { ns: "channels" })
      : i18next.t("page.channelIndex", {
          ns: "channels",
          index: channel.channelIndex,
        });
};

export const Channels = () => {
  const { hasChannelChange, setDialogOpen } = useDevice();
  const { deviceId } = useDeviceContext();
  const { channels } = useChannels(deviceId);
  const { t } = useTranslation("channels");

  const allChannels = channels;
  const flags = useMemo(
    () =>
      new Map(
        allChannels.map((channel) => [
          channel.channelIndex,
          hasChannelChange(channel.channelIndex),
        ]),
      ),
    [allChannels, hasChannelChange],
  );

  return (
    <Tabs defaultValue="channel_0">
      <TabsList className="w-full">
        {allChannels.map((channel) => (
          <TabsTrigger
            key={`channel_${channel.channelIndex}`}
            value={`channel_${channel.channelIndex}`}
            className="relative text-white"
          >
            {getChannelName(channel)}
            {flags.get(channel.channelIndex) && (
              <span className="absolute -top-0.5 -right-0.5 z-50 flex size-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500 opacity-25" />
                <span className="relative inline-flex size-3 rounded-full bg-sky-500" />
              </span>
            )}
          </TabsTrigger>
        ))}
        <Button
          variant={"outline"}
          className="ml-auto mr-1 h-8"
          onClick={() => setDialogOpen("import", true)}
        >
          <UploadIcon className="mr-2" size={14} />
          {t("page.import")}
        </Button>
        <Button
          variant={"outline"}
          className=" h-8"
          onClick={() => setDialogOpen("QR", true)}
        >
          <QrCodeIcon className="mr-2" size={14} />
          {t("page.export")}
        </Button>
      </TabsList>
      {allChannels.map((channel) => (
        <TabsContent
          key={`channel_${channel.channelIndex}`}
          value={`channel_${channel.channelIndex}`}
        >
          <Suspense fallback={<Spinner size="lg" className="my-5" />}>
            <Channel key={channel.channelIndex} channel={channel} />
          </Suspense>
        </TabsContent>
      ))}
    </Tabs>
  );
};
