import { ClientNotificationDialog } from "@components/Dialog/ClientNotificationDialog/ClientNotificationDialog.tsx";
import { DeleteMessagesDialog } from "@components/Dialog/DeleteMessagesDialog/DeleteMessagesDialog.tsx";
import { DeviceNameDialog } from "@components/Dialog/DeviceNameDialog.tsx";
import { ImportDialog } from "@components/Dialog/ImportDialog.tsx";
import { NodeDetailsDialog } from "@components/Dialog/NodeDetailsDialog/NodeDetailsDialog.tsx";
import { PkiBackupDialog } from "@components/Dialog/PKIBackupDialog.tsx";
import { QRDialog } from "@components/Dialog/QRDialog.tsx";
import { RebootDialog } from "@components/Dialog/RebootDialog.tsx";
import { RefreshKeysDialog } from "@components/Dialog/RefreshKeysDialog/RefreshKeysDialog.tsx";
import { RemoveNodeDialog } from "@components/Dialog/RemoveNodeDialog.tsx";
import { ShutdownDialog } from "@components/Dialog/ShutdownDialog.tsx";
import { UnsafeRolesDialog } from "@components/Dialog/UnsafeRolesDialog/UnsafeRolesDialog.tsx";
import { useDevice } from "@core/stores";

export const DialogManager = () => {
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
      <PkiBackupDialog
        open={dialog.pkiBackup}
        onOpenChange={(open) => {
          setDialogOpen("pkiBackup", open);
        }}
      />
      <NodeDetailsDialog
        open={dialog.nodeDetails}
        onOpenChange={(open) => {
          setDialogOpen("nodeDetails", open);
        }}
      />
      <UnsafeRolesDialog
        open={dialog.unsafeRoles}
        onOpenChange={(open) => {
          setDialogOpen("unsafeRoles", open);
        }}
      />
      <RefreshKeysDialog
        open={dialog.refreshKeys}
        onOpenChange={(open) => {
          setDialogOpen("refreshKeys", open);
        }}
      />
      <DeleteMessagesDialog
        open={dialog.deleteMessages}
        onOpenChange={(open) => {
          setDialogOpen("deleteMessages", open);
        }}
      />
      <ClientNotificationDialog
        open={dialog.clientNotification}
        onOpenChange={(open) => {
          setDialogOpen("clientNotification", open);
        }}
      />
    </>
  );
};
