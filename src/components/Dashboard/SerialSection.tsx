import { useCallback, useEffect, useState } from "react";
import { Button } from "@components/UI/Button.tsx";
import { useAppStore } from "@core/stores/appStore.ts";
import { useDeviceStore } from "@core/stores/deviceStore.ts";
import { subscribeAll } from "@core/subscriptions.ts";
import { randId } from "@core/utils/randId.ts";
import { MeshDevice } from "@meshtastic/core";
import { TransportWebSerial } from "@meshtastic/transport-web-serial";
import { AlertTriangle, Circle, Clock, Plus, Trash2, Usb } from "lucide-react";
import { useMessageStore } from "@core/stores/messageStore/index.ts";

interface SerialSectionProps {
  onConnect?: () => void;
}

export const SerialSection = ({ onConnect }: SerialSectionProps) => {
  const [connectionInProgress, setConnectionInProgress] = useState(false);
  const [connectingToPort, setConnectingToPort] = useState<SerialPort | null>(
    null,
  );
  const [serialPorts, setSerialPorts] = useState<SerialPort[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const { addDevice } = useDeviceStore();
  const messageStore = useMessageStore();
  const { setSelectedDevice } = useAppStore();

  const updateSerialPortList = useCallback(async () => {
    try {
      setSerialPorts((await navigator?.serial?.getPorts()) ?? []);
    } catch (error) {
      console.error("Error getting serial ports:", error);
    }
  }, []);

  useEffect(() => {
    const handleConnect = () => updateSerialPortList();
    const handleDisconnect = () => updateSerialPortList();

    navigator?.serial?.addEventListener("connect", handleConnect);
    navigator?.serial?.addEventListener("disconnect", handleDisconnect);

    updateSerialPortList();

    return () => {
      navigator?.serial?.removeEventListener("connect", handleConnect);
      navigator?.serial?.removeEventListener("disconnect", handleDisconnect);
    };
  }, [updateSerialPortList]);

  const connectToPort = async (port: SerialPort) => {
    setConnectingToPort(port);
    setConnectionError(null);

    try {
      const id = randId();
      const device = addDevice(id);
      setSelectedDevice(id);
      const transport = await TransportWebSerial.createFromPort(port);
      const connection = new MeshDevice(transport, id);
      connection.configure();
      device.addConnection(connection);
      subscribeAll(device, connection, messageStore);

      onConnect?.();
    } catch (error) {
      console.error("Serial connection error:", error);
      setConnectionError("Failed to connect to serial device");
    } finally {
      setConnectingToPort(null);
    }
  };

  const handleAddSerialDevice = async () => {
    setConnectionInProgress(true);
    setConnectionError(null);

    try {
      const port = await navigator.serial.requestPort();
      setSerialPorts([...serialPorts, port]);
    } catch (error) {
      console.error("Error requesting port:", error);
      if (error instanceof Error && !error.message.includes("cancelled")) {
        setConnectionError("Failed to add serial device");
      }
    } finally {
      setConnectionInProgress(false);
    }
  };

  const removeSerialPort = (portToRemove: SerialPort) => {
    setSerialPorts(serialPorts.filter((port) => port !== portToRemove));
  };

  const getPortInfo = (port: SerialPort, index: number) => {
    const { usbProductId, usbVendorId } = port.getInfo();
    const vendor = usbVendorId
      ? `0x${usbVendorId.toString(16).padStart(4, "0")}`
      : "Unknown";
    const product = usbProductId
      ? `0x${usbProductId.toString(16).padStart(4, "0")}`
      : "Unknown";
    return `Serial Port ${index + 1} (${vendor}:${product})`;
  };

  const getStatusIcon = (port: SerialPort) => {
    const isConnecting = connectingToPort === port;
    const isConnected = port.readable !== null;

    if (isConnecting) {
      return (
        <Circle className="h-3 w-3 fill-yellow-500 text-yellow-500 animate-spin" />
      );
    }
    if (isConnected) {
      return <Circle className="h-3 w-3 fill-green-500 text-green-500" />;
    }
    return <Circle className="h-3 w-3 fill-slate-400 text-slate-400" />;
  };

  const getStatusText = (port: SerialPort) => {
    if (connectingToPort === port) return "Connecting...";
    return port.readable !== null ? "Connected" : "Available";
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Usb className="h-5 w-5 text-green-600" />
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
          Serial Devices
        </h3>
      </div>

      {/* Device List */}
      <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
        {serialPorts.length === 0
          ? (
            <div className="text-center py-4 text-slate-500 dark:text-slate-400">
              <Usb className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No serial devices connected</p>
            </div>
          )
          : (
            serialPorts.map((port, index) => (
              <div
                key={`serial-${port.getInfo().usbVendorId ?? "unknown"}-${
                  port.getInfo().usbProductId ?? "unknown"
                }`}
                className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:shadow-sm transition-shadow"
              >
                {/* Status */}
                <div className="flex-shrink-0">
                  {getStatusIcon(port)}
                </div>

                {/* Port Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {getPortInfo(port, index)}
                    </span>
                    <Usb className="h-4 w-4 text-green-500" />
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {getStatusText(port)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    onClick={() => connectToPort(port)}
                    disabled={connectingToPort === port ||
                      port.readable !== null}
                  >
                    {connectingToPort === port
                      ? <Clock className="h-3 w-3 mr-1 animate-spin" />
                      : <Usb className="h-3 w-3 mr-1" />}
                    {port.readable !== null ? "Connected" : "Connect"}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSerialPort(port)}
                    className="text-slate-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}

        {/* Add Serial Device Button */}
        <Button
          variant="outline"
          onClick={handleAddSerialDevice}
          disabled={connectionInProgress}
          className="w-full border-dashed hover:border-solid"
        >
          {connectionInProgress
            ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            )
            : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Serial Device
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
