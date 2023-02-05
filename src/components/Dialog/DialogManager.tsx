import { useDevice } from "@core/stores/deviceStore.js";
import { QRDialog } from "@components/Dialog/QRDialog.js";
import { RebootDialog } from "@components/Dialog/RebootDialog.js";
import { ShutdownDialog } from "@components/Dialog/ShutdownDialog.js";
import { ImportDialog } from "@components/Dialog/ImportDialog.js";
import { DeviceNameDialog } from "./DeviceNameDialog.js";

export const DialogManager = (): JSX.Element => {
  const { channels, config, dialog, setDialogOpen } = useDevice();
  return (
    <>
      <QRDialog
        open={dialog.QR}
        onOpenChange={(open) => {
          setDialogOpen("QR", open);
        }}
        channels={channels.map((ch) => ch.config)}
        loraConfig={config.lora}
      />
      <ImportDialog
        open={dialog.import}
        onOpenChange={(open) => {
          setDialogOpen("import", open);
        }}
        channels={channels.map((ch) => ch.config)}
        loraConfig={config.lora}
      />
      <ShutdownDialog
        open={dialog.shutdown}
        onOpenChange={() => {
          setDialogOpen("shutdown", false);
        }}
      />
      <RebootDialog
        open={dialog.reboot}
        onOpenChange={() => {
          setDialogOpen("reboot", false);
        }}
      />
      <DeviceNameDialog
        open={dialog.deviceName}
        onOpenChange={(open) => {
          setDialogOpen("deviceName", open);
        }}
      />
    </>
  );
};
