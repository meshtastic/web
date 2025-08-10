import { Mono } from "@components/generic/Mono.tsx";
import { Button } from "@components/UI/Button.tsx";
import { useAppStore, useDeviceStore, useMessageStore } from "@core/stores";
import { subscribeAll } from "@core/subscriptions.ts";
import { randId } from "@core/utils/randId.ts";
import { MeshDevice } from "@meshtastic/core";
import { TransportWebSerial } from "@meshtastic/transport-web-serial";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TabElementProps } from "../../Dialog/NewDeviceDialog.tsx";

export const Serial = ({ closeDialog }: TabElementProps) => {
  const [connectionInProgress, setConnectionInProgress] = useState(false);
  const [serialPorts, setSerialPorts] = useState<SerialPort[]>([]);
  const { addDevice } = useDeviceStore();
  const messageStore = useMessageStore();
  const { setSelectedDevice } = useAppStore();
  const { t } = useTranslation();

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
    const transport = await TransportWebSerial.createFromPort(port);
    const connection = new MeshDevice(transport, id);
    connection.configure();
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
        {serialPorts.map((port, idx) => {
          const { usbProductId, usbVendorId } = port.getInfo();
          const vendor = usbVendorId ?? t("unknown.shortName");
          const product = usbProductId ?? t("unknown.shortName");
          return (
            <Button
              key={`${vendor}-${product}`}
              disabled={port.readable !== null}
              variant="default"
              onClick={async () => {
                setConnectionInProgress(true);
                await onConnect(port);
                // No need to setConnectionInProgress(false) here as closeDialog() unmounts.
              }}
            >
              {t("newDeviceDialog.serialConnection.deviceIdentifier", {
                vendorId: vendor,
                productId: product,
                index: idx,
              })}
            </Button>
          );
        })}
        {serialPorts.length === 0 && (
          <Mono className="m-auto select-none">
            {t("newDeviceDialog.serialConnection.noDevicesPaired")}
          </Mono>
        )}
      </div>
      <Button
        variant="default"
        onClick={async () => {
          await navigator.serial
            .requestPort()
            .then((port) => {
              setSerialPorts(serialPorts.concat(port));
              // No need to setConnectionInProgress(false) here if requestPort is quick
            })
            .catch((error: Error) => {
              console.error("Error requesting port:", error);
            })
            .finally(() => {
              setConnectionInProgress(false);
            });
        }}
      >
        <span>{t("newDeviceDialog.serialConnection.newDeviceButton")}</span>
      </Button>
    </fieldset>
  );
};
