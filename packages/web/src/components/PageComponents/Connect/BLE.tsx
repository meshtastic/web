import { Mono } from "@components/generic/Mono.tsx";
import { Button } from "@components/UI/Button.tsx";
import { useAppStore, useDeviceStore, useMessageStore } from "@core/stores";
import { subscribeAll } from "@core/subscriptions.ts";
import { randId } from "@core/utils/randId.ts";
import { MeshDevice } from "@meshtastic/core";
import { TransportWebBluetooth } from "@meshtastic/transport-web-bluetooth";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TabElementProps } from "../../Dialog/NewDeviceDialog.tsx";

export const BLE = ({ closeDialog }: TabElementProps) => {
  const [connectionInProgress, setConnectionInProgress] = useState(false);
  const [bleDevices, setBleDevices] = useState<BluetoothDevice[]>([]);
  const { addDevice } = useDeviceStore();
  const messageStore = useMessageStore();
  const { setSelectedDevice } = useAppStore();
  const { t } = useTranslation();

  const updateBleDeviceList = useCallback(async (): Promise<void> => {
    setBleDevices(await navigator.bluetooth.getDevices());
  }, []);

  useEffect(() => {
    updateBleDeviceList();
  }, [updateBleDeviceList]);

  const onConnect = async (bleDevice: BluetoothDevice) => {
    const id = randId();
    const transport = await TransportWebBluetooth.createFromDevice(bleDevice);
    const device = addDevice(id);
    const connection = new MeshDevice(transport, id);
    connection.configure();
    setSelectedDevice(id);
    device.addConnection(connection);
    subscribeAll(device, connection, messageStore);

    const HEARTBEAT_INTERVAL = 5 * 60 * 1000;
    connection.setHeartbeatInterval(HEARTBEAT_INTERVAL);

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
          <Mono className="m-auto select-none">
            {t("newDeviceDialog.bluetoothConnection.noDevicesPaired")}
          </Mono>
        )}
      </div>
      <Button
        variant="default"
        onClick={async () => {
          await navigator.bluetooth
            .requestDevice({
              filters: [{ services: [TransportWebBluetooth.ServiceUuid] }],
            })
            .then((device) => {
              const exists = bleDevices.findIndex((d) => d.id === device.id);
              if (exists === -1) {
                setBleDevices(bleDevices.concat(device));
              }
            })
            .catch((error: Error) => {
              console.error("Error requesting device:", error);
              setConnectionInProgress(false);
            })
            .finally(() => {
              setConnectionInProgress(false);
            });
        }}
      >
        <span>{t("newDeviceDialog.bluetoothConnection.newDeviceButton")}</span>
      </Button>
    </fieldset>
  );
};
