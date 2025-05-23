import type { TabElementProps } from "../../Dialog/NewDeviceDialog.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Mono } from "@components/generic/Mono.tsx";
import { useAppStore } from "@core/stores/appStore.ts";
import { useDeviceStore } from "@core/stores/deviceStore.ts";
import { subscribeAll } from "@core/subscriptions.ts";
import { randId } from "@core/utils/randId.ts";
import { MeshDevice } from "@meshtastic/core";
import { TransportWebSerial } from "@meshtastic/transport-web-serial";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMessageStore } from "../../../core/stores/messageStore/index.ts";

export const Serial = (
  { closeDialog }: TabElementProps,
) => {
  const [connectionInProgress, setConnectionInProgress] = useState(false);
  const [serialPorts, setSerialPorts] = useState<SerialPort[]>([]);
  const { addDevice } = useDeviceStore();
  const messageStore = useMessageStore();
  const { setSelectedDevice } = useAppStore();
  const { t } = useTranslation();

  const updateSerialPortList = useCallback(async () => {
    setSerialPorts(await navigator?.serial.getPorts());
  }, []);

  navigator?.serial?.addEventListener("connect", () => {
    updateSerialPortList();
  });
  navigator?.serial?.addEventListener("disconnect", () => {
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

    closeDialog();
  };

  return (
    <fieldset
      className="flex w-full flex-col gap-2 p-4"
      disabled={connectionInProgress}
    >
      <div className="flex h-48 flex-col gap-2 overflow-y-auto">
        {serialPorts.map((port, index) => {
          const { usbProductId, usbVendorId } = port.getInfo();
          const vendor = usbVendorId ?? t("common_unknown_short");
          const product = usbProductId ?? t("common_unknown_short");
          return (
            <Button
              key={`${vendor}-${product}-${index}`}
              disabled={port.readable !== null}
              variant="default"
              onClick={async () => {
                setConnectionInProgress(true);
                await onConnect(port);
                // No need to setConnectionInProgress(false) here as closeDialog() unmounts.
              }}
            >
              {t("serialConnection.deviceIdentifier", {
                index,
                vendorId: vendor,
                productId: product,
              })}
            </Button>
          );
        })}
        {serialPorts.length === 0 && (
          <Mono className="m-auto select-none">
            {t("serialConnection.noDevicesPaired")}
          </Mono>
        )}
      </div>
      <Button
        variant="default"
        onClick={async () => {
          await navigator.serial.requestPort().then((port) => {
            setSerialPorts(serialPorts.concat(port));
            // No need to setConnectionInProgress(false) here if requestPort is quick
          }).catch((error) => {
            console.error("Error requesting port:", error);
          }).finally(() => {
            setConnectionInProgress(false);
          });
        }}
      >
        <span>{t("serialConnection.newDeviceButton")}</span>
      </Button>
    </fieldset>
  );
};
