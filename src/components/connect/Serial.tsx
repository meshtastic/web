import type React from "react";
import { useCallback, useEffect, useState } from "react";

import { Button, majorScale, Pane } from "evergreen-ui";
import { FiPlusCircle } from "react-icons/fi";

import { subscribeAll } from "@app/core/subscriptions.js";
import { useDeviceStore } from "@core/stores/deviceStore.js";
import { randId } from "@core/utils/randId.js";
import { ISerialConnection } from "@meshtastic/meshtasticjs";

import type { CloseProps } from "../SlideSheets/NewDevice.js";

interface USBID {
  id: number;
  name: string;
}

export const Serial = ({ close }: CloseProps): JSX.Element => {
  const [serialPorts, setSerialPorts] = useState<SerialPort[]>([]);
  const { addDevice } = useDeviceStore();

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

  const onConnect = async (port: SerialPort) => {
    const id = randId();
    const device = addDevice(id);
    const connection = new ISerialConnection(id);
    await connection.connect({
      port,
      baudRate: 115200,
    });
    device.addConnection(connection);
    subscribeAll(device, connection);
    close();
  };

  const VID: USBID[] = [
    {
      id: 9114,
      name: "TBA",
    },
  ];

  const PID: USBID[] = [
    {
      id: 32809,
      name: "TBA",
    },
  ];

  return (
    <Pane
      display="flex"
      flexDirection="column"
      padding={majorScale(2)}
      gap={majorScale(2)}
    >
      {serialPorts.map((port, index) => (
        <Button
          key={index}
          gap={5}
          onClick={() => {
            void onConnect(port);
          }}
        >
          {VID.find((id) => id.id === port.getInfo().usbVendorId ?? 0)?.name ??
            "Unknown"}{" "}
          -{" "}
          {PID.find((id) => id.id === port.getInfo().usbProductId ?? 0)?.name ??
            "Unknown"}
          <FiPlusCircle />
        </Button>
      ))}

      <Button
        appearance="primary"
        gap={majorScale(1)}
        onClick={() => {
          void navigator.serial.requestPort().then((port) => {
            setSerialPorts(serialPorts.concat(port));
          });
        }}
      >
        New device
        <FiPlusCircle />
      </Button>
    </Pane>
  );
};
