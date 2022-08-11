import type React from "react";

import { Button, majorScale, Pane, TextInputField } from "evergreen-ui";
import { useForm } from "react-hook-form";
import { FiPlusCircle } from "react-icons/fi";

import { useAppStore } from "@app/core/stores/appStore.js";
import { useDeviceStore } from "@app/core/stores/deviceStore.js";
import { subscribeAll } from "@app/core/subscriptions.js";
import { randId } from "@app/core/utils/randId.js";
import { IHTTPConnection } from "@meshtastic/meshtasticjs";

export interface HTTPProps {
  close: () => void;
}

export const HTTP = ({ close }: HTTPProps): JSX.Element => {
  const { addDevice } = useDeviceStore();
  const { setSelectedDevice } = useAppStore();
  const { register, handleSubmit } = useForm<{
    ip: string;
    tls: boolean;
  }>({
    defaultValues: {
      ip: "meshtastic.local",
      tls: false,
    },
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
    close();
  });

  return (
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    <form onSubmit={onSubmit}>
      <Pane
        display="flex"
        flexDirection="column"
        padding={majorScale(2)}
        gap={majorScale(2)}
      >
        <TextInputField label="IP Address/Hostname" {...register("ip")} />
        <Button appearance="primary" gap={majorScale(1)} type="submit">
          Connect
          <FiPlusCircle />
        </Button>
      </Pane>
    </form>
  );
};
