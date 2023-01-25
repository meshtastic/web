import type React from "react";

import { useDevice } from "@app/core/providers/useDevice.js";
import { QRDialog } from "@components/Dialog/QRDialog.js";

import { RebootDialog } from "./RebootDialog.js";
import { ShutdownDialog } from "./ShutdownDialog.js";
import { ImportDialog } from "./ImportDialog.js";

export const DialogManager = (): JSX.Element => {
  const { channels, config, dialog, setDialogOpen } = useDevice();
  return (
    <>
      <QRDialog
        isOpen={dialog.QR}
        close={() => {
          setDialogOpen("QR", false);
        }}
        channels={channels.map((ch) => ch.config)}
        loraConfig={config.lora}
      />
      <ImportDialog
        isOpen={dialog.import}
        close={() => {
          setDialogOpen("import", false);
        }}
        channels={channels.map((ch) => ch.config)}
        loraConfig={config.lora}
      />
      <ShutdownDialog
        isOpen={dialog.shutdown}
        close={() => {
          setDialogOpen("shutdown", false);
        }}
      />
      <RebootDialog
        isOpen={dialog.reboot}
        close={() => {
          setDialogOpen("reboot", false);
        }}
      />
    </>
  );
};
