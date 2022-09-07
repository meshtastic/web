import type React from "react";
import { useCallback, useEffect, useState } from "react";

import { Button, majorScale, Pane } from "evergreen-ui";
import { FiPlusCircle } from "react-icons/fi";

import type { CloseProps } from "@components/SlideSheets/NewDevice.js";
import { useAppStore } from "@core/stores/appStore.js";
import { useDeviceStore } from "@core/stores/deviceStore.js";
import { subscribeAll } from "@core/subscriptions.js";
import { randId } from "@core/utils/randId.js";
import { ISerialConnection } from "@meshtastic/meshtasticjs";

interface USBID {
  id: number;
  name: string;
}

export const Serial = ({ close }: CloseProps): JSX.Element => {
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

  const onConnect = async (port: SerialPort) => {
    const id = randId();
    const device = addDevice(id);
    setSelectedDevice(id);
    const connection = new ISerialConnection(id);
    await connection.connect({
      port,
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
