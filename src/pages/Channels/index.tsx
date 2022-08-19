import type React from "react";
import { useState } from "react";

import { Button, LayerIcon, LayerOutlineIcon, Tooltip } from "evergreen-ui";
import { IoQrCodeOutline } from "react-icons/io5";

import { QRDialog } from "@app/components/Dialog/QRDialog.js";
import { TabbedContent, TabType } from "@components/layout/page/TabbedContent";
import { useDevice } from "@core/providers/useDevice.js";
import { Protobuf } from "@meshtastic/meshtasticjs";

import { Channel } from "./Channel.js";

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
      icon:
        channel.config.role !== Protobuf.Channel_Role.DISABLED
          ? LayerIcon
          : LayerOutlineIcon,
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
            <Tooltip content="Open QR code generator">
              <Button
                onClick={() => {
                  setQRDialogOpen(true);
                }}
                iconBefore={IoQrCodeOutline}
              >
                QR Code
              </Button>
            </Tooltip>
          ),
        ]}
      />
    </>
  );
};
