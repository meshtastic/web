import { TabElementProps } from "@app/components/Dialog/NewDeviceDialog";
import { Button } from "@components/UI/Button.js";
import { Mono } from "@components/generic/Mono.js";
import { useAppStore } from "@core/stores/appStore.js";
import { useDeviceStore } from "@core/stores/deviceStore.js";
import { subscribeAll } from "@core/subscriptions.js";
import { randId } from "@core/utils/randId.js";
import { SerialConnection } from "@meshtastic/js";
import { useCallback, useEffect, useState } from "react";

export const Serial = ({ closeDialog }: TabElementProps): JSX.Element => {
  const [serialPorts, setSerialPorts] = useState<SerialPort[]>([]);
  const { addDevice } = useDeviceStore();
  const { setSelectedDevice } = useAppStore();

  const updateSerialPortList = useCallback(async () => {
    setSerialPorts(await navigator.serial.getPorts());
  }, []);

  navigator.serial.addEventListener("connect", () => {
    updateSerialPortList();
  });
  navigator.serial.addEventListener("disconnect", () => {
    updateSerialPortList();
  });
  useEffect(() => {
    updateSerialPortList();
  }, [updateSerialPortList]);

  const onConnect = async (port: SerialPort) => {
    const id = randId();
    const device = addDevice(id);
    setSelectedDevice(id);
    const connection = new SerialConnection(id);
    await connection
      .connect({
        port,
        baudRate: undefined,
        concurrentLogOutput: true,
      })
      .catch((e: Error) => console.log(`Unable to Connect: ${e.message}`));
    device.addConnection(connection);
    subscribeAll(device, connection);

    closeDialog();
  };

  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <div className="flex h-48 flex-col gap-2 overflow-y-auto">
        {serialPorts.map((port, index) => (
          <Button
            key={index}
            disabled={port.readable !== null}
            onClick={async () => {
              await onConnect(port);
            }}
          >
            {`# ${index} - ${port.getInfo().usbVendorId ?? "UNK"} - ${
              port.getInfo().usbProductId ?? "UNK"
            }`}
          </Button>
        ))}
        {serialPorts.length === 0 && (
          <Mono className="m-auto select-none">No devices paired yet.</Mono>
        )}
      </div>
      <Button
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
