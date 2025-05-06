import type { TabElementProps } from "../../Dialog/NewDeviceDialog.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Mono } from "@components/generic/Mono.tsx";
import { useAppStore } from "@core/stores/appStore.ts";
import { useDeviceStore } from "@core/stores/deviceStore.ts";
import { subscribeAll } from "@core/subscriptions.ts";
import { randId } from "@core/utils/randId.ts";
import { BleConnection, ServiceUuid } from "@meshtastic/js";
import { useCallback, useEffect, useState } from "react";
import { useMessageStore } from "../../../core/stores/messageStore/index.ts";

export const BLE = (
  { closeDialog }: TabElementProps,
) => {
  const [connectionInProgress, setConnectionInProgress] = useState(false);
  const [bleDevices, setBleDevices] = useState<BluetoothDevice[]>([]);
  const { addDevice } = useDeviceStore();
  const messageStore = useMessageStore();
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
    subscribeAll(device, connection, messageStore);

    closeDialog();
  };

  return (
    <fieldset
      className="flex w-full flex-col gap-2 p-4"
      disabled={connectionInProgress}
    >
      <div className="flex h-48 flex-col gap-2 overflow-y-auto">
        {bleDevices.map((device) => (
          <Button
            key={device.id}
            variant="default"
            onClick={() => {
              setConnectionInProgress(true);
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
        variant="default"
        onClick={async () => {
          await navigator.bluetooth
            .requestDevice({
              filters: [{ services: [ServiceUuid] }],
            })
            .then((device) => {
              const exists = bleDevices.findIndex((d) => d.id === device.id);
              if (exists === -1) {
                setBleDevices(bleDevices.concat(device));
              }
            }).catch((error) => {
              console.error("Error requesting device:", error);
              setConnectionInProgress(false);
            }).finally(() => {
              setConnectionInProgress(false);
            });
        }}
      >
        <span>New device</span>
      </Button>
    </fieldset>
  );
};
