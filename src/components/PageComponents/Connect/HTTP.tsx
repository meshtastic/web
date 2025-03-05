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
import { useForm, useController } from "react-hook-form";

interface FormData {
  ip: string;
  tls: boolean;
}

export const HTTP = ({ closeDialog }: TabElementProps) => {
  const isURLHTTPS = location.protocol === "https:";

  const { addDevice } = useDeviceStore();
  const { setSelectedDevice } = useAppStore();

  const { control, handleSubmit, register } = useForm<FormData>({
    defaultValues: {
      ip: ["client.meshtastic.org", "localhost"].includes(
        window.location.hostname,
      )
        ? "meshtastic.local"
        : window.location.host,
      tls: isURLHTTPS ? true : false,
    },
  });

  const {
    field: { value: tlsValue, onChange: setTLS },
  } = useController({ name: "tls", control });

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
        <div>
          <Label>IP Address/Hostname</Label>
          <Input
            prefix={tlsValue ? "https://" : "http://"}
            placeholder="000.000.000.000 / meshtastic.local"
            className="text-slate-900 dark:text-slate-900"
            disabled={connectionInProgress}
            {...register("ip")}
          />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Switch
            onCheckedChange={setTLS}
            disabled={isURLHTTPS || connectionInProgress}
            checked={isURLHTTPS || tlsValue}
            {...register("tls")}
          />
          <Label>Use HTTPS</Label>

        </div>
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