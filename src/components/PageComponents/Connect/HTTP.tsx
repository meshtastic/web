import type { TabElementProps } from "@components/Dialog/NewDeviceDialog.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Input } from "@components/UI/Input.tsx";
import { Label } from "@components/UI/Label.tsx";
import { Switch } from "@components/UI/Switch.tsx";
import { useAppStore } from "@core/stores/appStore.ts";
import { useDeviceStore } from "@core/stores/deviceStore.ts";
import { subscribeAll } from "@core/subscriptions.ts";
import { randId } from "@core/utils/randId.ts";
import { MeshDevice } from "@meshtastic/core";
import { TransportHTTP } from "@meshtastic/transport-http";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

export const HTTP = ({ closeDialog }: TabElementProps) => {
  const [https, setHTTPS] = useState(false);
  const { addDevice } = useDeviceStore();
  const { setSelectedDevice } = useAppStore();
  const { register, handleSubmit, control } = useForm<{
    ip: string;
    tls: boolean;
  }>({
    defaultValues: {
      ip: ["client.meshtastic.org", "localhost"].includes(
        globalThis.location.hostname,
      )
        ? "meshtastic.local"
        : globalThis.location.host,
      tls: location.protocol === "https:",
    },
  });

  const [connectionInProgress, setConnectionInProgress] = useState(false);

  const onSubmit = handleSubmit(async (data) => {
    setConnectionInProgress(true);

    const id = randId();
    const device = addDevice(id);
    const transport = await TransportHTTP.create(data.ip, data.tls);
    const connection = new MeshDevice(transport, id);
    connection.configure();

    setSelectedDevice(id);
    device.addConnection(connection);
    subscribeAll(device, connection);
    closeDialog();
  });

  return (
    <form className="flex w-full flex-col gap-2 p-4" onSubmit={onSubmit}>
      <div className="flex h-48 flex-col gap-2">
        <Label>IP Address/Hostname</Label>
        <Input
          prefix={https ? "https://" : "http://"}
          placeholder="000.000.000.000 / meshtastic.local"
          className="text-slate-900 dark:text-slate-900"
          disabled={connectionInProgress}
          {...register("ip")}
        />
        <Controller
          name="tls"
          control={control}
          render={({ field: { ...rest } }) => (
            <>
              <Label>Use HTTPS</Label>
              <Switch
                onCheckedChange={(checked: boolean) => {
                  checked ? setHTTPS(true) : setHTTPS(false);
                }}
                disabled={location.protocol === "https:" ||
                  connectionInProgress}
                checked={https}
                {...rest}
              />
            </>
          )}
        />
      </div>
      <Button
        type="submit"
        disabled={connectionInProgress}
        className="dark:bg-slate-900 dark:text-white"
      >
        <span>{connectionInProgress ? "Connecting..." : "Connect"}</span>
      </Button>
    </form>
  );
};
