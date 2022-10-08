import type React from "react";

import { useDevice } from "@app/core/providers/useDevice.js";

import { QRDialog } from "./QRDialog.js";

export const DialogManager = (): JSX.Element => {
  const { channels, config, QRDialogOpen, setQRDialogOpen } = useDevice();
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
    </>
  );
};
