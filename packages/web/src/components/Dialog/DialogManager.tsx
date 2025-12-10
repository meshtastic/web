import { FactoryResetConfigDialog } from "@app/components/Dialog/FactoryResetConfigDialog/FactoryResetConfigDialog";
import { FactoryResetDeviceDialog } from "@app/components/Dialog/FactoryResetDeviceDialog/FactoryResetDeviceDialog";
import { ClearAllStoresDialog } from "@components/Dialog/ClearAllStoresDialog/ClearAllStoresDialog.tsx";
import { ClientNotificationDialog } from "@components/Dialog/ClientNotificationDialog/ClientNotificationDialog.tsx";
import { DeleteMessagesDialog } from "@components/Dialog/DeleteMessagesDialog/DeleteMessagesDialog.tsx";
import { NodeDetailsDrawer } from "@components/Dialog/NodeDetailsDrawer";
import { PkiBackupDialog } from "@components/Dialog/PKIBackupDialog.tsx";
import { QRDialog } from "@components/Dialog/QRDialog.tsx";
import { RebootDialog } from "@components/Dialog/RebootDialog.tsx";
import { RefreshKeysDialog } from "@components/Dialog/RefreshKeysDialog/RefreshKeysDialog.tsx";
import { RemoveNodeDialog } from "@components/Dialog/RemoveNodeDialog.tsx";
import { ResetNodeDbDialog } from "@components/Dialog/ResetNodeDbDialog/ResetNodeDbDialog.tsx";
import { ShutdownDialog } from "@components/Dialog/ShutdownDialog.tsx";
import { UnsafeRolesDialog } from "@components/Dialog/UnsafeRolesDialog/UnsafeRolesDialog.tsx";
import { useDevice } from "@core/stores";
import { useChannels } from "@db/hooks";
import { toByteArray } from "base64-js";
import { useMemo } from "react";

export const DialogManager = () => {
  const { config, dialog, setDialogOpen, id: deviceId } = useDevice();
  const { channels: dbChannels } = useChannels(deviceId);

  // Convert DB channels to Map format for QRDialog
  const channelsMap = useMemo(() => {
    const map = new Map();
    for (const ch of dbChannels) {
      map.set(ch.channelIndex, {
        index: ch.channelIndex,
        role: ch.role,
        settings: {
          name: ch.name || undefined,
          psk: ch.psk ? toByteArray(ch.psk) : undefined,
          uplinkEnabled: ch.uplinkEnabled,
          downlinkEnabled: ch.downlinkEnabled,
        },
      });
    }
    return map;
  }, [dbChannels]);
  return (
    <>
      {/* <QRDialog
        open={dialog.QR}
        onOpenChange={(open) => {
          setDialogOpen("QR", open);
        }}
        channels={channelsMap}
        loraConfig={config.lora}
      /> */}
      {/* <ImportDialog
        open={dialog.import}
        onOpenChange={(open) => {
          setDialogOpen("import", open);
        }}
        loraConfig={config.lora}
      /> */}
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
      <ResetNodeDbDialog
        open={dialog.resetNodeDb}
        onOpenChange={(open) => {
          setDialogOpen("resetNodeDb", open);
        }}
      />
      <ClearAllStoresDialog
        open={dialog.clearAllStores}
        onOpenChange={(open) => {
          setDialogOpen("clearAllStores", open);
        }}
      />
      <FactoryResetDeviceDialog
        open={dialog.factoryResetDevice}
        onOpenChange={(open) => {
          setDialogOpen("factoryResetDevice", open);
        }}
      />
      <FactoryResetConfigDialog
        open={dialog.factoryResetConfig}
        onOpenChange={(open) => {
          setDialogOpen("factoryResetConfig", open);
        }}
      />
      <NodeDetailsDrawer
        open={dialog.nodeDetails}
        onOpenChange={(open) => {
          setDialogOpen("nodeDetails", open);
        }}
      />
    </>
  );
};
