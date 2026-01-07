import { useChannels } from "@data/hooks";
import { useDevice, useUIStore } from "@state/index.ts";
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
  const { id: deviceId, config } = useDevice();
  const dialogs = useUIStore((s) => s.dialogs);
  const setDialogOpen = useUIStore((s) => s.setDialogOpen);
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
        open={dialogs.QR}
        onOpenChange={(open) => {
          setDialogOpen("QR", open);
        }}
        channels={channelsMap}
        loraConfig={config.lora}
      />
      <ShutdownDialog
        open={dialogs.shutdown}
        onOpenChange={() => {
          setDialogOpen("shutdown", false);
        }}
      />
      <RebootDialog
        open={dialogs.reboot}
        onOpenChange={() => {
          setDialogOpen("reboot", false);
        }}
      />
      <RemoveNodeDialog
        open={dialogs.nodeRemoval}
        onOpenChange={(open) => {
          setDialogOpen("nodeRemoval", open);
        }}
      />
      <PkiBackupDialog
        open={dialogs.pkiBackup}
        onOpenChange={(open) => {
          setDialogOpen("pkiBackup", open);
        }}
      />
      <UnsafeRolesDialog
        open={dialogs.unsafeRoles}
        onOpenChange={(open) => {
          setDialogOpen("unsafeRoles", open);
        }}
      />
      <RefreshKeysDialog
        open={dialogs.refreshKeys}
        onOpenChange={(open) => {
          setDialogOpen("refreshKeys", open);
        }}
      />
      <DeleteMessagesDialog
        open={dialogs.deleteMessages}
        onOpenChange={(open) => {
          setDialogOpen("deleteMessages", open);
        }}
      />
      <ClientNotificationDialog
        open={dialogs.clientNotification}
        onOpenChange={(open) => {
          setDialogOpen("clientNotification", open);
        }}
      />
      <ResetNodeDbDialog
        open={dialogs.resetNodeDb}
        onOpenChange={(open) => {
          setDialogOpen("resetNodeDb", open);
        }}
      />
      <FactoryResetDeviceDialog
        open={dialogs.factoryResetDevice}
        onOpenChange={(open) => {
          setDialogOpen("factoryResetDevice", open);
        }}
      />
      <FactoryResetConfigDialog
        open={dialogs.factoryResetConfig}
        onOpenChange={(open) => {
          setDialogOpen("factoryResetConfig", open);
        }}
      />
      <Activity>
        <NodeDetailsDrawer
          open={dialogs.nodeDetails}
          onOpenChange={(open) => {
            setDialogOpen("nodeDetails", open);
          }}
        />
      </Activity>
      <TracerouteResponseDialog />
      <DeviceShareDialog
        open={dialogs.deviceShare}
        onOpenChange={(open) => {
          setDialogOpen("deviceShare", open);
        }}
      />
    </>
  );
};
