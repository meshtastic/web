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

interface BluetoothSectionProps {
  onConnect?: () => void;
}

export const BluetoothSection = ({ onConnect }: BluetoothSectionProps) => {
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

      onConnect?.();
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
    if (connectingToDevice === device.id) return "Connecting...";
    return device.gatt?.connected ? "Connected" : "Paired";
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Bluetooth className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
          Bluetooth Devices
        </h3>
      </div>

      {/* Device List */}
      <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
        {bleDevices.length === 0
          ? (
            <div className="text-center py-4 text-slate-500 dark:text-slate-400">
              <Bluetooth className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No Bluetooth devices paired</p>
            </div>
          )
          : (
            bleDevices.map((device) => (
              <div
                key={device.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:shadow-sm transition-shadow"
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
                    {device.gatt?.connected ? "Connected" : "Connect"}
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
                Pairing...
              </>
            )
            : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Pair New Device
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
