import type { TabElementProps } from "../../Dialog/NewDeviceDialog.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Mono } from "@components/generic/Mono.tsx";
import { useAppStore } from "@core/stores/appStore.ts";
import { useDeviceStore } from "@core/stores/deviceStore.ts";
import { subscribeAll } from "@core/subscriptions.ts";
import { randId } from "@core/utils/randId.ts";
import { MeshDevice } from "@meshtastic/core";
import { TransportWebSerial } from "@meshtastic/transport-web-serial";
import { useCallback, useEffect, useState } from "react";

export const Serial = ({ closeDialog }: TabElementProps) => {
  const [serialPorts, setSerialPorts] = useState<SerialPort[]>([]);
  const { addDevice } = useDeviceStore();
  const { setSelectedDevice } = useAppStore();

  const updateSerialPortList = useCallback(async () => {
    setSerialPorts(await navigator?.serial.getPorts());
  }, []);

  navigator?.serial?.addEventListener("connect", () => {
    updateSerialPortList();
  });
  navigator?.serial?.addEventListener("disconnect", () => {
    updateSerialPortList();
  });
  useEffect(() => {
    updateSerialPortList();
  }, [updateSerialPortList]);

  const onConnect = async (port: SerialPort) => {
    const id = randId();
    const device = addDevice(id);
    setSelectedDevice(id);
    const transport = await TransportWebSerial.createFromPort(port);
    const connection = new MeshDevice(transport, id);
    connection.configure();
    device.addConnection(connection);
    subscribeAll(device, connection);

    closeDialog();
  };

  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <div className="flex h-48 flex-col gap-2 overflow-y-auto">
        {serialPorts.map((port, index) => {
          const { usbProductId, usbVendorId } = port.getInfo();
          return (
            <Button
              key={`${usbVendorId ?? "UNK"}-${usbProductId ?? "UNK"}-${index}`}
              disabled={port.readable !== null}
              className="dark:bg-slate-900 dark:text-white"
              onClick={async () => {
                await onConnect(port);
              }}
            >
              {`# ${index} - ${usbVendorId ?? "UNK"} - ${usbProductId ?? "UNK"
                }`}
            </Button>
          );
        })}
        {serialPorts.length === 0 && (
          <Mono className="m-auto select-none">No devices paired yet.</Mono>
        )}
      </div>
      <Button
        className="dark:bg-slate-900 dark:text-white"
        onClick={async () => {
          await navigator.serial.requestPort().then((port) => {
            setSerialPorts(serialPorts.concat(port));
          });
        }}
      >
        <span>New device</span>
      </Button>
    </div>
  );
};
