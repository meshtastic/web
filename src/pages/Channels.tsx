import type React from "react";
import { useState } from "react";

import { Channel } from "@app/components/PageComponents/Channel.js";
import { Button } from "@components/Button.js";
import { QRDialog } from "@components/Dialog/QRDialog.js";
import { TabbedContent, TabType } from "@components/layout/page/TabbedContent";
import { useDevice } from "@core/providers/useDevice.js";
import { QrCodeIcon } from "@heroicons/react/24/outline";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const ChannelsPage = (): JSX.Element => {
  const { channels, config } = useDevice();
  const [QRDialogOpen, setQRDialogOpen] = useState(false);

  const tabs: TabType[] = channels.map((channel) => {
    return {
      name: channel.config.settings?.name.length
        ? channel.config.settings.name
        : channel.config.role === Protobuf.Channel_Role.PRIMARY
        ? "Primary"
        : `Channel: ${channel.config.index}`,
      element: () => <Channel channel={channel.config} />,
    };
  });

  return (
    <>
      <QRDialog
        isOpen={QRDialogOpen}
        close={() => {
          setQRDialogOpen(false);
        }}
        channels={channels.map((ch) => ch.config)}
        loraConfig={config.lora}
      />
      <TabbedContent
        tabs={tabs}
        actions={[
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
          ),
        ]}
      />
    </>
  );
};
