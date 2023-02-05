import { useCallback, useEffect, useState } from "react";
import { Mono } from "@components/generic/Mono.js";
import { Button } from "@components/form/Button.js";
import { useAppStore } from "@core/stores/appStore.js";
import { useDeviceStore } from "@core/stores/deviceStore.js";
import { subscribeAll } from "@core/subscriptions.js";
import { randId } from "@core/utils/randId.js";
import { PlusCircleIcon } from "@heroicons/react/24/outline";
import { ISerialConnection } from "@meshtastic/meshtasticjs";

export const Serial = (): JSX.Element => {
  const [serialPorts, setSerialPorts] = useState<SerialPort[]>([]);
  const { addDevice } = useDeviceStore();
  const { setSelectedDevice } = useAppStore();

  const updateSerialPortList = useCallback(async () => {
    setSerialPorts(await navigator.serial.getPorts());
  }, []);

  navigator.serial.addEventListener("connect", () => {
    void updateSerialPortList();
  });
  navigator.serial.addEventListener("disconnect", () => {
    void updateSerialPortList();
  });
  useEffect(() => {
    void updateSerialPortList();
  }, [updateSerialPortList]);

  // // Check if this is a meshtastic device
  // const probe = async (port: SerialPort) => {
  //   return;
  //   if(port.readable)
  //     return;
  //   console.log("Creating connection");
  //   const connection = new ISerialConnection(randId());
  //   await connection.connect({ port, concurrentLogOutput: false });
  //   connection.events.onNodeInfoPacket.subscribe( async (nodeInfo) => {      
  //     console.log(nodeInfo);
  //   });    
  // }  

  const onConnect = async (port: SerialPort) => {
    const id = randId();
    const device = addDevice(id);
    setSelectedDevice(id);
    const connection = new ISerialConnection(id);
    await connection
      .connect({
        port,
        baudRate: undefined,
        concurrentLogOutput: true
      })
      .catch((e: Error) => console.log(`Unable to Connect: ${e.message}`));
    device.addConnection(connection);
    device.setSerialPort(port);
    subscribeAll(device, connection);
  };

  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <div className="flex h-48 flex-col gap-2 overflow-y-auto">
        {serialPorts.map((port, index) => (
          <Button
            key={index}
            disabled={port.readable !== null}
            onClick={() => {
              void onConnect(port);
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
        onClick={() => {
          void navigator.serial.requestPort().then((port) => {
            setSerialPorts(serialPorts.concat(port));
          });
        }}
      >
        <PlusCircleIcon className="w-4" />
        <span>New device</span>
      </Button>
      <Button
        onClick={async () => {          
          await Promise.all(serialPorts.map(s => s.forget()));
          setSerialPorts([]);
        }}
      >
        Clear all
      </Button>
    </div>
  );
};
