import { useAppStore } from "@app/core/stores/appStore.js";
import { useDeviceStore } from "@app/core/stores/deviceStore.js";
import { Button } from "@components/UI/Button.js";
import { Separator } from "@components/UI/Seperator.js";
import { H3 } from "@components/UI/Typography/H3.js";
import { Subtle } from "@components/UI/Typography/Subtle.js";
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
  const { setConnectDialogOpen } = useAppStore();
  const { getDevices } = useDeviceStore();

  const devices = useMemo(() => getDevices(), [getDevices]);

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <H3>Connected Devices</H3>
          <Subtle>Manage, connect and disconnect devices</Subtle>
        </div>
      </div>

      <Separator />

      <div className="flex h-[450px] rounded-md border border-dashed border-slate-200 p-3 dark:border-slate-700">
        {devices.length ? (
          <ul className="grow divide-y divide-gray-200">
            {devices.map((device) => {
              return (
                <li key={device.id}>
                  <div className="px-4 py-4 sm:px-6">
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
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="flex gap-2 text-sm text-gray-500">
                        <UsersIcon
                          size={20}
                          className="text-gray-400"
                          aria-hidden="true"
                        />
                        {device.nodes.size === 0 ? 0 : device.nodes.size - 1}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="m-auto flex flex-col gap-3 text-center">
            <ListPlusIcon size={48} className="mx-auto text-textSecondary" />
            <H3>No Devices</H3>
            <Subtle>Connect atleast one device to get started</Subtle>
            <Button
              className="gap-2"
              onClick={() => setConnectDialogOpen(true)}
            >
              <PlusIcon size={16} />
              New Connection
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
