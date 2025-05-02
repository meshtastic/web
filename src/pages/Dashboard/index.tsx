import { Heading } from "@components/UI/Typography/Heading.tsx";
import { useAppStore } from "@core/stores/appStore.ts";
import { useDeviceStore } from "@core/stores/deviceStore.ts";
import { Button } from "@components/UI/Button.tsx";
import { Separator } from "@components/UI/Seperator.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import {
  BluetoothIcon,
  ListPlusIcon,
  NetworkIcon,
  PlusIcon,
  UsbIcon,
  UsersIcon,
} from "lucide-react";
import { useMemo } from "react";

export const Dashboard = () => {
  const { setConnectDialogOpen, setSelectedDevice } = useAppStore();
  const { getDevices } = useDeviceStore();

  const devices = useMemo(() => getDevices(), [getDevices]);

  return (
    <>
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Heading as="h3">Connected Devices</Heading>
            <Subtle>Manage, connect and disconnect devices</Subtle>
          </div>
        </div>

        <Separator />

        <div className="flex h-[450px] rounded-md border border-dashed border-slate-200 p-3 dark:border-slate-700">
          {devices.length
            ? (
              <ul className="grow divide-y divide-slate-200">
                {devices.map((device) => {
                  return (
                    <li key={device.id}>
                      <button
                        type="button"
                        className="w-full px-4 py-4 sm:px-6"
                        onClick={() => {
                          setSelectedDevice(device.id);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <p className="truncate text-sm font-medium text-accent">
                            {device.nodes.get(device.hardware.myNodeNum)?.user
                              ?.longName ?? "UNK"}
                          </p>
                          <div className="inline-flex w-24 justify-center gap-2 rounded-full bg-slate-100 py-1 text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-700 hover:text-slate-50">
                            {device.connection?.connType === "ble" && (
                              <>
                                <BluetoothIcon size={16} />
                                BLE
                              </>
                            )}
                            {device.connection?.connType === "serial" && (
                              <>
                                <UsbIcon size={16} />
                                Serial
                              </>
                            )}
                            {device.connection?.connType === "http" && (
                              <>
                                <NetworkIcon size={16} />
                                Network
                              </>
                            )}
                          </div>
                          <div className="mt-2 sm:flex sm:justify-between">
                            <div className="flex gap-2 text-sm text-slate-500">
                              <UsersIcon
                                size={20}
                                className="text-slate-400"
                                aria-hidden="true"
                              />
                              {device.nodes.size === 0
                                ? 0
                                : device.nodes.size - 1}
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
            : (
              <div className="m-auto flex flex-col gap-3 text-center">
                <ListPlusIcon
                  size={48}
                  className="mx-auto text-text-secondary"
                />
                <Heading as="h3">No Devices</Heading>
                <Subtle>Connect at least one device to get started</Subtle>
                <Button
                  className="gap-2 dark:bg-white dark:text-slate-900 dark:hover:text-slate-100"
                  variant="default"
                  onClick={() => setConnectDialogOpen(true)}
                >
                  <PlusIcon size={16} />
                  New Connection
                </Button>
              </div>
            )}
        </div>
      </div>
    </>
  );
};
