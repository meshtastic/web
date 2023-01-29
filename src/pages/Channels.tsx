import { TabbedContent, TabType } from "@components/generic/TabbedContent";
import { Channel } from "@components/PageComponents/Channel.js";
import { useDevice } from "@core/providers/useDevice.js";
import {
  ArrowDownOnSquareStackIcon,
  QrCodeIcon
} from "@heroicons/react/24/outline";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const ChannelsPage = (): JSX.Element => {
  const { channels, setDialogOpen } = useDevice();

  const tabs: TabType[] = channels.map((channel) => {
    return {
      label: channel.config.settings?.name.length
        ? channel.config.settings.name
        : channel.config.role === Protobuf.Channel_Role.PRIMARY
        ? "Primary"
        : `Channel: ${channel.config.index}`,
      element: () => <Channel channel={channel.config} />
    };
  });

  return (
    <TabbedContent
      tabs={tabs}
      actions={[
        {
          icon: <ArrowDownOnSquareStackIcon className="w-4" />,
          action: () => setDialogOpen("import", true)
        },
        {
          icon: <QrCodeIcon className="w-4" />,
          action: () => setDialogOpen("QR", true)
        }
      ]}
    />
  );
};
