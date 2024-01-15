import { TabElementProps } from "@app/components/Dialog/NewDeviceDialog";
import { Button } from "@components/UI/Button.js";
import { Mono } from "@components/generic/Mono.js";
import { useAppStore } from "@core/stores/appStore.js";
import { useDeviceStore } from "@core/stores/deviceStore.js";
import { subscribeAll } from "@core/subscriptions.js";
import { randId } from "@core/utils/randId.js";
import { BleConnection, Constants } from "@meshtastic/js";
import { useCallback, useEffect, useState } from "react";

export const BLE = ({ closeDialog }: TabElementProps): JSX.Element => {
  const [bleDevices, setBleDevices] = useState<BluetoothDevice[]>([]);
  const { addDevice } = useDeviceStore();
  const { setSelectedDevice } = useAppStore();

  const updateBleDeviceList = useCallback(async (): Promise<void> => {
    setBleDevices(await navigator.bluetooth.getDevices());
  }, []);

  useEffect(() => {
    updateBleDeviceList();
  }, [updateBleDeviceList]);

  const onConnect = async (bleDevice: BluetoothDevice) => {
    const id = randId();
    const device = addDevice(id);
    setSelectedDevice(id);
    const connection = new BleConnection(id);
    await connection.connect({
      device: bleDevice,
    });
    device.addConnection(connection);
    subscribeAll(device, connection);

    closeDialog();
  };

  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <div className="flex h-48 flex-col gap-2 overflow-y-auto">
        {bleDevices.map((device) => (
          <Button
            key={device.id}
            onClick={() => {
              onConnect(device);
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
        onClick={async () => {
          await navigator.bluetooth
            .requestDevice({
              filters: [{ services: [Constants.ServiceUuid] }],
            })
            .then((device) => {
              const exists = bleDevices.findIndex((d) => d.id === device.id);
              if (exists === -1) {
                setBleDevices(bleDevices.concat(device));
              }
            });
        }}
      >
        <span>New device</span>
      </Button>
    </div>
  );
};
