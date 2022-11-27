import type React from "react";

import { Channel } from "@app/components/PageComponents/Channel.js";
import { Button } from "@components/Button.js";
import { TabbedContent, TabType } from "@components/layout/page/TabbedContent";
import { useDevice } from "@core/providers/useDevice.js";
import {
  ArrowDownOnSquareStackIcon,
  QrCodeIcon
} from "@heroicons/react/24/outline";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const ChannelsPage = (): JSX.Element => {
  const { channels, setQRDialogOpen } = useDevice();

  const tabs: TabType[] = channels.map((channel) => {
    return {
      name: channel.config.settings?.name.length
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
        () => (
          <Button
            variant="secondary"
            iconBefore={<ArrowDownOnSquareStackIcon className="w-4" />}
            onClick={() => {
              setQRDialogOpen(true);
            }}
          >
            Import
          </Button>
        ),
        () => (
          <Button
            variant="secondary"
            iconBefore={<QrCodeIcon className="w-4" />}
            onClick={() => {
              setQRDialogOpen(true);
            }}
          >
            QR Code
          </Button>
        )
      ]}
    />
  );
};
