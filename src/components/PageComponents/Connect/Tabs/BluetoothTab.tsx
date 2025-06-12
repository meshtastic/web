import { useCallback, useEffect, useState } from "react";
import { Button } from "@components/UI/Button.tsx";
import { useAppStore } from "@core/stores/appStore.ts";
import { useDeviceStore } from "@core/stores/deviceStore.ts";
import { subscribeAll } from "@core/subscriptions.ts";
import { randId } from "@core/utils/randId.ts";
import { TransportWebBluetooth } from "@meshtastic/transport-web-bluetooth";
import { MeshDevice } from "@meshtastic/core";
import {
  AlertTriangle,
  Bluetooth,
  Circle,
  Clock,
  Plus,
  Trash2,
} from "lucide-react";
import { useMessageStore } from "@core/stores/messageStore/index.ts";
import { useTranslation } from "react-i18next";

interface BluetoothTabProps {
  closeDialog: () => void;
}

export const BluetoothTab = ({ closeDialog }: BluetoothTabProps) => {
  const { t } = useTranslation("dialog");
  const [connectionInProgress, setConnectionInProgress] = useState(false);
  const [connectingToDevice, setConnectingToDevice] = useState<string | null>(
    null,
  );
  const [bleDevices, setBleDevices] = useState<BluetoothDevice[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const { addDevice } = useDeviceStore();
  const messageStore = useMessageStore();
  const { setSelectedDevice } = useAppStore();

  const updateBleDeviceList = useCallback(async (): Promise<void> => {
    try {
      // Check if Web Bluetooth API and getDevices method are available
      if (
        !navigator.bluetooth ||
        typeof navigator.bluetooth.getDevices !== "function"
      ) {
        console.warn(
          "Web Bluetooth API getDevices() not supported in this browser",
        );
        return;
      }
      setBleDevices(await navigator.bluetooth.getDevices());
    } catch (error) {
      console.error("Error getting Bluetooth devices:", error);
    }
  }, []);

  useEffect(() => {
    updateBleDeviceList();
  }, [updateBleDeviceList]);

  const connectToDevice = async (bleDevice: BluetoothDevice) => {
    setConnectingToDevice(bleDevice.id);
    setConnectionError(null);

    try {
      const id = randId();
      const transport = await TransportWebBluetooth.createFromDevice(bleDevice);
      const device = addDevice(id);
      const connection = new MeshDevice(transport, id);
      connection.configure();
      setSelectedDevice(id);
      device.addConnection(connection);
      subscribeAll(device, connection, messageStore);

      closeDialog();
    } catch (error) {
      console.error("Bluetooth connection error:", error);
      setConnectionError(`Failed to connect to ${bleDevice.name ?? "device"}`);
    } finally {
      setConnectingToDevice(null);
    }
  };

  const handlePairNewDevice = async () => {
    setConnectionInProgress(true);
    setConnectionError(null);

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [TransportWebBluetooth.ServiceUuid] }],
      });

      const exists = bleDevices.findIndex((d) => d.id === device.id);
      if (exists === -1) {
        setBleDevices([...bleDevices, device]);
      }
    } catch (error) {
      console.error("Error pairing device:", error);
      if (error instanceof Error && !error.message.includes("cancelled")) {
        setConnectionError("Failed to pair new device");
      }
    } finally {
      setConnectionInProgress(false);
    }
  };

  const removeBleDevice = (deviceId: string) => {
    setBleDevices(bleDevices.filter((d) => d.id !== deviceId));
  };

  const getStatusIcon = (device: BluetoothDevice) => {
    const isConnecting = connectingToDevice === device.id;
    const isConnected = device.gatt?.connected;

    if (isConnecting) {
      return (
        <Circle className="h-3 w-3 fill-yellow-500 text-yellow-500 animate-spin" />
      );
    }
    if (isConnected) {
      return <Circle className="h-3 w-3 fill-blue-500 text-blue-500" />;
    }
    return <Circle className="h-3 w-3 fill-slate-300 text-slate-300" />;
  };

  const getStatusText = (device: BluetoothDevice) => {
    if (connectingToDevice === device.id) {
      return t("newDeviceDialog.tabs.status.connecting");
    }
    return device.gatt?.connected
      ? t("newDeviceDialog.tabs.status.connected")
      : t("newDeviceDialog.tabs.status.paired");
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Bluetooth className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
          {t("newDeviceDialog.tabs.bluetooth.title")}
        </h3>
      </div>

      {/* Device List */}
      <div className="space-y-2 min-h-[300px]">
        {bleDevices.length === 0
          ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Bluetooth className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm mb-2">
                {t("newDeviceDialog.tabs.bluetooth.noDevices")}
              </p>
              <p className="text-xs text-slate-400">
                {t("newDeviceDialog.tabs.bluetooth.pairFirst")}
              </p>
            </div>
          )
          : (
            bleDevices.map((device) => (
              <div
                key={device.id}
                className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {/* Status */}
                <div className="flex-shrink-0">
                  {getStatusIcon(device)}
                </div>

                {/* Device Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {device.name ?? "Unknown Device"}
                    </span>
                    <Bluetooth className="h-4 w-4 text-blue-500" />
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {getStatusText(device)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    onClick={() => connectToDevice(device)}
                    disabled={connectingToDevice === device.id ||
                      device.gatt?.connected}
                  >
                    {connectingToDevice === device.id
                      ? <Clock className="h-3 w-3 mr-1 animate-spin" />
                      : <Bluetooth className="h-3 w-3 mr-1" />}
                    {device.gatt?.connected
                      ? t("newDeviceDialog.tabs.status.connected")
                      : t("newDeviceDialog.tabs.actions.connect")}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBleDevice(device.id)}
                    className="text-slate-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}

        {/* Pair New Device Button */}
        <Button
          variant="outline"
          onClick={handlePairNewDevice}
          disabled={connectionInProgress}
          className="w-full border-dashed hover:border-solid"
        >
          {connectionInProgress
            ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                {t("newDeviceDialog.tabs.bluetooth.pairing")}
              </>
            )
            : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                {t("newDeviceDialog.tabs.bluetooth.pairDevice")}
              </>
            )}
        </Button>

        {/* Connection Error */}
        {connectionError && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
            <div className="flex gap-2 items-start">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-200">
                {connectionError}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
