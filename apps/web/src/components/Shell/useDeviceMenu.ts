import { useNodesAsProto } from "@core/hooks/useNodesAsProto.ts";
import { useActiveClient } from "@core/kmp/hooks";
import { useAppStore, useDevice, useDeviceStore } from "@core/stores";
import { useConnections } from "@pages/Connections/useConnections.ts";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  type DeviceListEntry,
  type DeviceMenuActionId,
  type DeviceSummary,
  deviceListEntries,
} from "./deviceSummary.ts";
import { useDeviceSummary } from "./useDeviceSummary.ts";

export interface DeviceMenuController {
  summary: DeviceSummary;
  devices: readonly DeviceListEntry[];
  runAction: (action: DeviceMenuActionId) => void;
  selectDevice: (deviceId: number) => void;
  connectAnother: () => void;
}

/** Device menu data and the existing app actions its items trigger. */
export function useDeviceMenu(): DeviceMenuController {
  const { t } = useTranslation("common");
  const summary = useDeviceSummary();
  const navigate = useNavigate();
  const client = useActiveClient();
  const { disconnect } = useConnections();
  const activeConnectionId = useDeviceStore((s) => s.activeConnectionId);
  const savedConnections = useDeviceStore((s) => s.savedConnections);
  const storedDevices = useDeviceStore((s) => s.devices);
  const { setDialogOpen } = useDevice();
  const openConnections = useAppStore((s) => s.openConnections);
  const selectedDeviceId = useAppStore((s) => s.selectedDeviceId);
  const setSelectedDevice = useAppStore((s) => s.setSelectedDevice);
  const nodes = useNodesAsProto();

  const devices = useMemo(
    () =>
      deviceListEntries(
        Array.from(storedDevices.values(), (device) => {
          const myNodeNum = device.myNodeNum ?? device.hardware.myNodeNum;
          const connection =
            savedConnections.find((c) => c.id === device.connectionId) ??
            savedConnections.find(
              (c) => myNodeNum !== 0 && c.nodeNum === myNodeNum,
            );
          return {
            id: device.id,
            myNodeNum,
            connectionName: connection?.name,
          };
        }),
        selectedDeviceId,
        (nodeNum) => nodes.find((node) => node.num === nodeNum)?.user,
        (last4) => t("fallbackName", { last4 }),
      ),
    [storedDevices, savedConnections, selectedDeviceId, nodes, t],
  );

  const runAction = useCallback(
    (action: DeviceMenuActionId) => {
      switch (action) {
        case "deviceSettings":
          void navigate({ to: "/settings/device" });
          return;
        case "manageConnections":
          openConnections();
          return;
        case "reboot":
          setDialogOpen("reboot", true);
          return;
        case "disconnect": {
          // Through the connection manager, so the saved connection is
          // marked disconnected and session teardowns run; a bare client
          // disconnect would read as a lost connection.
          const done = activeConnectionId
            ? disconnect(activeConnectionId)
            : client?.disconnect();
          void Promise.resolve(done).catch((error: unknown) => {
            console.error("Failed to disconnect:", error);
          });
          return;
        }
      }
    },
    [
      navigate,
      openConnections,
      setDialogOpen,
      activeConnectionId,
      disconnect,
      client,
    ],
  );

  return {
    summary,
    devices,
    runAction,
    selectDevice: setSelectedDevice,
    connectAnother: () => openConnections("add"),
  };
}
