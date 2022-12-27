import type React from "react";

import { useDevice } from "@app/core/providers/useDevice.js";
import { QRDialog } from "@components/Dialog/QRDialog.js";

import { RebootDialog } from "./RebootDialog.js";
import { ShutdownDialog } from "./ShutdownDialog.js";
import { ImportDialog } from "./ImportDialog.js";

export const DialogManager = (): JSX.Element => {
  const {
    channels,
    config,
    importDialogOpen,
    setImportDialogOpen,
    QRDialogOpen,
    setQRDialogOpen,
    shutdownDialogOpen,
    setShutdownDialogOpen,
    rebootDialogOpen,
    setRebootDialogOpen
  } = useDevice();
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
      <ImportDialog
        isOpen={importDialogOpen}
        close={() => {
          setImportDialogOpen(false);
        }}
        channels={channels.map((ch) => ch.config)}
        loraConfig={config.lora}
      />
      <ShutdownDialog
        isOpen={shutdownDialogOpen}
        close={() => {
          setShutdownDialogOpen(false);
        }}
      />
      <RebootDialog
        isOpen={rebootDialogOpen}
        close={() => {
          setRebootDialogOpen(false);
        }}
      />
    </>
  );
};
