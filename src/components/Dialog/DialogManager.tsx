import { DeviceNameDialog } from "@components/Dialog/DeviceNameDialog.js";
import { ImportDialog } from "@components/Dialog/ImportDialog.js";
import { QRDialog } from "@components/Dialog/QRDialog.js";
import { RebootDialog } from "@components/Dialog/RebootDialog.js";
import { ShutdownDialog } from "@components/Dialog/ShutdownDialog.js";
import { useDevice } from "@core/stores/deviceStore.js";

export const DialogManager = (): JSX.Element => {
  const { channels, config, dialog, setDialogOpen } = useDevice();
  return (
    <>
      <QRDialog
        open={dialog.QR}
        onOpenChange={(open) => {
          setDialogOpen("QR", open);
        }}
        channels={channels}
        loraConfig={config.lora}
      />
      <ImportDialog
        open={dialog.import}
        onOpenChange={(open) => {
          setDialogOpen("import", open);
        }}
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
