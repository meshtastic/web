import type React from "react";
import { useCallback, useEffect, useState } from "react";

import { Mono } from "@app/components/generic/Mono.js";
import { Button } from "@components/form/Button.js";
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
      device: BLEDevice
    });
    device.addConnection(connection);
    subscribeAll(device, connection);
  };

  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <div className="flex h-48 flex-col gap-2 overflow-y-auto">
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
        {bleDevices.length === 0 && (
          <Mono className="m-auto select-none">No devices paired yet.</Mono>
        )}
      </div>
      <Button
        iconBefore={<PlusCircleIcon className="w-4" />}
        onClick={() => {
          void navigator.bluetooth
            .requestDevice({
              filters: [{ services: [Constants.serviceUUID] }]
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
