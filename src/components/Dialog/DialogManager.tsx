import { RemoveNodeDialog } from "@app/components/Dialog/RemoveNodeDialog.tsx";
import { DeviceNameDialog } from "@components/Dialog/DeviceNameDialog.tsx";
import { ImportDialog } from "@components/Dialog/ImportDialog.tsx";
import { QRDialog } from "@components/Dialog/QRDialog.tsx";
import { RebootDialog } from "@components/Dialog/RebootDialog.tsx";
import { ShutdownDialog } from "@components/Dialog/ShutdownDialog.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";

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
      <RemoveNodeDialog
        open={dialog.nodeRemoval}
        onOpenChange={(open) => {
          setDialogOpen("nodeRemoval", open);
        }}
      />
    </>
  );
};
