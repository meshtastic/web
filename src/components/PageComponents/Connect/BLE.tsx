import type React from "react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@components/Button.js";
import { useAppStore } from "@core/stores/appStore.js";
import { useDeviceStore } from "@core/stores/deviceStore.js";
import { subscribeAll } from "@core/subscriptions.js";
import { randId } from "@core/utils/randId.js";
import { PlusCircleIcon } from "@heroicons/react/24/outline";
import { Constants, IBLEConnection } from "@meshtastic/meshtasticjs";

export const BLE = (): JSX.Element => {
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
  };

  return (
    <div className="flex flex-col p-4 gap-2 w-full">
      <div className="flex gap-2 flex-col h-48 overflow-y-auto">
        {bleDevices.map((device, index) => (
          <Button
            key={index}
            variant="secondary"
            onClick={() => {
              void onConnect(device);
            }}
          >
            {device.name}
          </Button>
        ))}
      </div>
      <Button
        iconBefore={<PlusCircleIcon className="w-4" />}
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
      </Button>
    </div>
  );
};
