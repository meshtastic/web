import { useChannels } from "@data/hooks";
import { useDevice } from "@state/index.ts";
import { toByteArray } from "base64-js";
import { Activity, useMemo } from "react";
import { ClientNotificationDialog } from "./ClientNotificationDialog/ClientNotificationDialog.tsx";
import { DeleteMessagesDialog } from "./DeleteMessagesDialog/DeleteMessagesDialog.tsx";
import { DeviceShareDialog } from "./DeviceShareDialog.tsx";
import { FactoryResetConfigDialog } from "./FactoryResetConfigDialog/FactoryResetConfigDialog.tsx";
import { FactoryResetDeviceDialog } from "./FactoryResetDeviceDialog/FactoryResetDeviceDialog.tsx";
import { NodeDetailsDrawer } from "./NodeDetailsDrawer/index.ts";
import { PkiBackupDialog } from "./PKIBackupDialog.tsx";
import { QRDialog } from "./QRDialog.tsx";
import { RebootDialog } from "./RebootDialog.tsx";
import { RefreshKeysDialog } from "./RefreshKeysDialog/RefreshKeysDialog.tsx";
import { RemoveNodeDialog } from "./RemoveNodeDialog.tsx";
import { ResetNodeDbDialog } from "./ResetNodeDbDialog/ResetNodeDbDialog.tsx";
import { ShutdownDialog } from "./ShutdownDialog.tsx";
import { TracerouteResponseDialog } from "./TracerouteResponseDialog.tsx";
import { UnsafeRolesDialog } from "./UnsafeRolesDialog/UnsafeRolesDialog.tsx";

export const DialogManager = () => {
  const { dialog, setDialogOpen, id: deviceId, config } = useDevice();
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
      <QRDialog
        open={dialog.QR}
        onOpenChange={(open) => {
          setDialogOpen("QR", open);
        }}
        channels={channelsMap}
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
      <Activity>
        <NodeDetailsDrawer
          open={dialog.nodeDetails}
          onOpenChange={(open) => {
            setDialogOpen("nodeDetails", open);
          }}
        />
      </Activity>
      <TracerouteResponseDialog />
      <DeviceShareDialog
        open={dialog.deviceShare}
        onOpenChange={(open) => {
          setDialogOpen("deviceShare", open);
        }}
      />
    </>
  );
};
