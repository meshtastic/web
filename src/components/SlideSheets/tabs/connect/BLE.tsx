import type React from "react";
import { useCallback, useEffect, useState } from "react";

import { Button, majorScale, Pane } from "evergreen-ui";
import { FiPlusCircle } from "react-icons/fi";

import type { CloseProps } from "@components/SlideSheets/NewDevice.js";
import { useAppStore } from "@core/stores/appStore.js";
import { useDeviceStore } from "@core/stores/deviceStore.js";
import { subscribeAll } from "@core/subscriptions.js";
import { randId } from "@core/utils/randId.js";
import { Constants, IBLEConnection } from "@meshtastic/meshtasticjs";

export const BLE = ({ close }: CloseProps): JSX.Element => {
  const [bleDevices, setBleDevices] = useState<BluetoothDevice[]>([]);
  const { addDevice } = useDeviceStore();
  const { setSelectedDevice } = useAppStore();

  const updateBleDeviceList = useCallback(async (): Promise<void> => {
    setBleDevices(await navigator.bluetooth.getDevices());
  }, []);

  useEffect(() => {
    void updateBleDeviceList();
  }, [updateBleDeviceList]);

  const onConnect = async (BLEDevice: BluetoothDevice) => {
    const id = randId();
    const device = addDevice(id);
    setSelectedDevice(id);
    const connection = new IBLEConnection(id);
    await connection.connect({
      device: BLEDevice,
    });
    device.addConnection(connection);
    subscribeAll(device, connection);
    close();
  };

  return (
    <Pane
      display="flex"
      flexDirection="column"
      padding={majorScale(2)}
      gap={majorScale(2)}
    >
      {bleDevices.map((device, index) => (
        <Button
          key={index}
          onClick={() => {
            void onConnect(device);
          }}
        >
          {device.name}
        </Button>
      ))}

      <Button
        appearance="primary"
        gap={majorScale(1)}
        onClick={() => {
          void navigator.bluetooth
            .requestDevice({
              filters: [{ services: [Constants.SERVICE_UUID] }],
            })
            .then((device) => {
              const exists = bleDevices.findIndex((d) => d.id === device.id);
              if (exists === -1) {
                setBleDevices(bleDevices.concat(device));
              }
            });
        }}
      >
        New device
        <FiPlusCircle />
      </Button>
    </Pane>
  );
};
