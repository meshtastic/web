import type React from "react";

import { TabbedContent, TabType } from "@app/components/generic/TabbedContent";
import { Channel } from "@app/components/PageComponents/Channel.js";
import { Button } from "@components/form/Button.js";
import { useDevice } from "@core/providers/useDevice.js";
import {
  ArrowDownOnSquareStackIcon,
  QrCodeIcon
} from "@heroicons/react/24/outline";
import { Protobuf } from "@meshtastic/meshtasticjs";
import { Mono } from "@app/components/generic/Mono";

export const SetupPage = (): JSX.Element => {
    return ( <Mono>Setup page goes here</Mono> )
  const { channels, setQRDialogOpen, setImportDialogOpen } = useDevice();

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
        {
          icon: <ArrowDownOnSquareStackIcon className="w-4" />,
          action: () => setImportDialogOpen(true)
        },
        {
          icon: <QrCodeIcon className="w-4" />,
          action: () => setQRDialogOpen(true)
        }
      ]}
    />
  );
};
