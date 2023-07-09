import { Button } from "@components/UI/Button.js";
import { Input } from "@components/UI/Input.js";
import { Label } from "@components/UI/Label.js";
import { SelectLabel } from "@components/UI/Select.js";
import { Switch } from "@components/UI/Switch.js";
import { useAppStore } from "@core/stores/appStore.js";
import { useDeviceStore } from "@core/stores/deviceStore.js";
import { subscribeAll } from "@core/subscriptions.js";
import { randId } from "@core/utils/randId.js";
import { IHTTPConnection } from "@meshtastic/meshtasticjs";
import { Controller, useForm, useWatch } from "react-hook-form";

export const HTTP = (): JSX.Element => {
  const { addDevice } = useDeviceStore();
  const { setSelectedDevice } = useAppStore();
  const { register, handleSubmit, control } = useForm<{
    ip: string;
    tls: boolean;
  }>({
    defaultValues: {
      ip: ["client.meshtastic.org", "localhost"].includes(
        window.location.hostname,
      )
        ? "meshtastic.local"
        : window.location.hostname,
      tls: location.protocol === "https:",
    },
  });

  const TLSEnabled = useWatch({
    control,
    name: "tls",
    defaultValue: location.protocol === "https:",
  });

  const onSubmit = handleSubmit((data) => {
    const id = randId();
    const device = addDevice(id);
    setSelectedDevice(id);
    const connection = new IHTTPConnection(id);
    // TODO: Promise never resolves
    void connection.connect({
      address: data.ip,
      fetchInterval: 2000,
      tls: data.tls,
    });
    device.addConnection(connection);
    subscribeAll(device, connection);
  });

  return (
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    <form className="flex w-full flex-col gap-2 p-4" onSubmit={onSubmit}>
      <div className="flex h-48 flex-col gap-2">
        <Label>IP Address/Hostname</Label>
        <Input
          // label="IP Address/Hostname"
          prefix={TLSEnabled ? "https://" : "http://"}
          placeholder="000.000.000.000 / meshtastic.local"
          {...register("ip")}
        />
        <Controller
          name="tls"
          control={control}
          render={({ field: { value, ...rest } }) => (
            <>
              <Label>Use TLS</Label>
              <Switch
                // label="Use TLS"
                // description="Description"
                disabled={location.protocol === "https:"}
                checked={value}
                {...rest}
              />
            </>
          )}
        />
      </div>
      <Button>
        <span>Connect</span>
      </Button>
    </form>
  );
};
