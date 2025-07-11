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
import { useTranslation } from "react-i18next";

interface SerialTabProps {
  closeDialog: () => void;
}

export const SerialTab = ({ closeDialog }: SerialTabProps) => {
  const { t } = useTranslation("dialog");
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

      closeDialog();
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

      // Check for user cancellation - different browsers use different error types/messages
      const isDOMCancellation = error instanceof DOMException &&
        error.name === "NotFoundError";
      const isErrorCancellation = error instanceof Error && (
        error.message.includes("cancelled") ||
        error.message.includes("canceled") ||
        error.message.includes("User cancelled") ||
        error.message.includes("No port selected")
      );
      const isUserCancellation = isDOMCancellation || isErrorCancellation;

      if (!isUserCancellation) {
        setConnectionError("Failed to add serial device");
      }
      // If it's user cancellation, we silently ignore it (no error shown)
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
    if (connectingToPort === port) {
      return t("newDeviceDialog.tabs.status.connecting");
    }
    return port.readable !== null
      ? t("newDeviceDialog.tabs.status.connected")
      : t("newDeviceDialog.tabs.status.available");
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Usb className="h-5 w-5 text-green-600" />
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
          {t("newDeviceDialog.tabs.serial.title")}
        </h3>
      </div>

      {/* Device List */}
      <div className="space-y-2 min-h-[300px]">
        {serialPorts.length === 0
          ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Usb className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm mb-2">
                {t("newDeviceDialog.tabs.serial.noDevices")}
              </p>
              <p className="text-xs text-slate-400">
                {t("newDeviceDialog.tabs.serial.connectFirst")}
              </p>
            </div>
          )
          : (
            serialPorts.map((port, index) => (
              <div
                key={`serial-${port.getInfo().usbVendorId ?? "unknown"}-${
                  port.getInfo().usbProductId ?? "unknown"}-${index}`}
                className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
                    {port.readable !== null
                      ? t("newDeviceDialog.tabs.status.connected")
                      : t("newDeviceDialog.tabs.actions.connect")}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSerialPort(port)}
                    className="text-slate-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="size-5" />
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
                {t("newDeviceDialog.tabs.serial.adding")}
              </>
            )
            : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                {t("newDeviceDialog.tabs.serial.addDevice")}
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
